import type {
	Dependency,
	ImportMap,
	Registry,
	RegistryInput,
	RegistryName,
	RegistryServer,
	ZooOptions,
} from "./types.ts";
import { denoland, github, nestland, npm, std } from "./registries.ts";
import { InvalidInput } from "./error.ts";

const registries: Record<RegistryName, Registry> = {
	denoland,
	nestland,
	github,
	std,
	npm,
};

// deno-lint-ignore no-explicit-any
function isRegistryInput(a: any): a is RegistryInput {
	if (a.registry !== undefined && a.name !== undefined) {
		return true;
	}
	return false;
}

function parseImportMap(a: string, from: string): ImportMap {
	// deno-lint-ignore no-explicit-any
	let json: Record<string, any>;
	try {
		json = JSON.parse(a);
	} catch {
		throw new InvalidInput("invalid json from " + from);
	}
	const keys = Object.keys(json);
	if (
		keys.length < 1 &&
		keys.length > 2 &&
		keys.find((v) => !["scopes", "imports"].includes(v))
	) {
		// deno-fmt-ignore
		throw new InvalidInput("import map has unexpected keys, received: " + (keys.join(", ") || "nothing"));
	}
	if (json.imports !== undefined) {
		// prevent create conflict between module using scoped import map
		json.scopes["./"] = Object.assign({}, json.imports, json.scopes["./"]);
	}
	for (const k in json.scopes) {
		if (k.startsWith("/") || k.startsWith("../")) {
			// I think "//" depend on protocol and "/" will resolved from root
			// both of "//" and "/" will throw an Errror because it has no consistent content in diffrent environment
			// ../ will search to another module instead
			throw new InvalidInput("zoo only supporting './*' for relative path ");
		}
		json.scopes[k] = Object.fromEntries(
			Object
				.entries(json.scopes[k])
				.sort((a, b) => a[0].localeCompare(b[0])),
		);
		if (k.startsWith("./")) {
			json.scopes[new URL(k, from).href] = json.scopes[k];
		}
	}
	return json;
}

const DEFAULT_SERVER: RegistryServer = {
	npm: "esm.sh",
	github: "raw",
	std: null,
	nestland: null,
	denoland: null,
};

export class ImportMapBuilder {
	constructor() {
		this.importMap = {
			imports: {},
			scopes: {},
		};
	}
	importMap: Required<ImportMap>;

	get value() {
		this.importMap.scopes["./"] = Object.fromEntries(
			Object.entries(this.importMap.scopes["./"]).sort((a, b) => a[0].localeCompare(b[0])),
		);
		return this.importMap;
	}

	async addScopes(url: string): Promise<void> {
		try {
			const { protocol } = new URL(url);
			if (!protocol.startsWith("http")) {
				throw {};
			}
		} catch {
			throw new InvalidInput("invalid import map, received: " + url);
		}
		const importMap = await fetch(url, {
			redirect: "manual",
			headers: {
				"User-Agent": "https://github.com/Falentio/zoo",
			},
		})
			.then((r) => r.text())
			.then((text) => parseImportMap(text, url)) as ImportMap;
		this.importMap.scopes = Object.assign(
			{},
			importMap.scopes,
			this.importMap.scopes,
		);
	}

	addDependency(dependency: Dependency): (w: string) => void {
		const dir = dependency.dir || new URL("./", dependency.from).href;
		return (w: string) => {
			this.importMap.scopes[w] = this.importMap.scopes[w] || {};
			this.importMap.scopes[w][dependency.name] = dependency.from;
			this.importMap.scopes[w][dependency.name + "/"] = dir;
		};
	}
}

export class Zoo {
	// extend other zoo instance
	static extend(zoo: Zoo): Zoo {
		const { defaultServer, shadowing } = zoo.opts;
		const dependencies = zoo.deps;
		return new Zoo({ defaultServer, shadowing, dependencies });
	}

	constructor({ defaultServer = {}, shadowing = true, dependencies = [] }: ZooOptions = {}) {
		this.deps = [];
		this.importMapBuilder = new ImportMapBuilder();
		this.opts = {
			defaultServer: Object.assign({}, DEFAULT_SERVER, defaultServer),
			shadowing,
			dependencies,
		} as Required<ZooOptions>;
		for (const dependency of this.opts.dependencies) {
			this.add(dependency);
		}
	}
	deps: (Dependency | Promise<Dependency>)[];
	opts: Required<ZooOptions>;
	importMapBuilder: ImportMapBuilder;
	readonly #scope = "./";

	async getMap(stringify?: false): Promise<ImportMap>;
	async getMap(stringify?: true): Promise<string>;
	async getMap(stringify = false): Promise<ImportMap | string> {
		for (const dependency of await this.getDeps()) {
			const scope: string[] = ["./"];
			// if (dependency.scope === undefined) {
			// 	scope = [this.#scope];
			// } else if (typeof dependency.scope === "string") {
			// 	scope = [dependency.scope];
			// } else if (Array.isArray(dependency.scope)) {
			// 	({ scope } = dependency);
			// } else {
			// 	// deno-fmt-ignore
			// 	throw new InvalidInput("invalid scope value, received: " + typeof dependency.scope);
			// }
			// if (this.opts.shadowing) {
			// 	scope.push("./");
			// }
			scope.forEach(this.importMapBuilder.addDependency(dependency));
			if (dependency.importMap) {
				await this.importMapBuilder.addScopes(dependency.importMap);
			}
		}
		const sorted = Object.fromEntries(
			Object.entries(this.importMapBuilder.value).sort((a, b) => a[0].localeCompare(b[0])),
		);
		if (stringify) {
			return JSON.stringify(sorted, null, "\t");
		}
		return sorted;
	}

	getDeps(): Promise<Dependency[]> {
		return Promise.all(this.deps);
	}

	async #dependencyFromRegistry(input: RegistryInput): Promise<Dependency> {
		if (input.version === undefined) {
			input.version = await registries[input.registry].getLatest(input.name);
		}
		if (input.path === undefined) {
			input.path = "mod.ts";
		}
		if (input.server === undefined) {
			input.server = this.opts.defaultServer[input.registry];
		}
		if (input.alias === undefined) {
			input.alias = input.name;
		}
		if (input.scope === undefined) {
			input.scope = this.#scope;
		}
		const dep: Dependency = await registries[input.registry].getDependency(
			input as Required<RegistryInput>,
		);
		return dep;
	}

	// scope(path: string): this {
	// 	this.#scope = path;
	// 	return this;
	// }

	add(dependency: Promise<Dependency> | Dependency | RegistryInput): this {
		if (isRegistryInput(dependency)) {
			dependency = this.#dependencyFromRegistry(dependency) as Promise<Dependency>;
		}
		this.deps.push(dependency);
		return this;
	}

	npm(name: string): this {
		return this.add({
			registry: "npm",
			name,
		});
	}

	std(name: string): this {
		return this.add({
			registry: "std",
			name,
		});
	}

	github(name: string): this {
		return this.add({
			registry: "github",
			name,
		});
	}

	denoland(name: string): this {
		return this.add({
			registry: "denoland",
			name,
		});
	}

	nestland(name: string): this {
		return this.add({
			registry: "nestland",
			name,
		});
	}
}
