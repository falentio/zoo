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
		if (k.startsWith("/")) {
			// I think "//" depend on protocol and "/" will resolved from root
			// both of "//" and "/" will throw an Errror because it has no consistent content in diffrent environment
			throw new InvalidInput("zoo only supporting './*' for relative path ");
		}
		if (k.startsWith("../")) {
			// it will conflict when imported from deno.land/x/ & x.nest.land
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

export class Zoo {
	constructor(opts: ZooOptions = {}) {
		const {
			defaultServer = {},
			shadowing = true,
			dependencies = [],
		} = opts;
		this.defaultServer = Object.assign({}, DEFAULT_SERVER, defaultServer);
		this.shadowing = shadowing;
		for (const dependency of dependencies) {
			this.add(dependency);
		}
	}
	defaultServer: RegistryServer;
	shadowing: boolean;
	#deps: (Dependency | Promise<Dependency>)[] = [];
	#scope = "./";

	async #joinImportMap(importMap: Required<ImportMap>, url: string): Promise<void> {
		try {
			const { protocol } = new URL(url);
			if (!protocol.startsWith("http")) {
				throw {};
			}
		} catch {
			throw new InvalidInput("invalid import map, received: " + url);
		}
		const importMap2 = await fetch(url, {
			redirect: "manual",
			headers: {
				"User-Agent": "https://github.com/Falentio/zoo",
			},
		})
			.then((r) => r.text())
			.then((text) => parseImportMap(text, url)) as ImportMap;
		importMap.scopes = Object.assign(
			{},
			importMap2.scopes,
			importMap.scopes,
		);
	}

	#joinWorkspace(importMap: Required<ImportMap>, dependency: Dependency): (w: string) => void {
		const dir = dependency.dir || new URL("./", dependency.from).href;
		return (w: string) => {
			importMap.scopes[w] = importMap.scopes[w] || {};
			importMap.scopes[w][dependency.name] = dependency.from;
			importMap.scopes[w][dependency.name + "/"] = dir;
		};
	}

	async getMap(stringify?: false): Promise<ImportMap>;
	async getMap(stringify?: true): Promise<string>;
	async getMap(stringify = false): Promise<ImportMap | string> {
		const importMap: Required<ImportMap> = {
			imports: {},
			scopes: {},
		};
		for (const dependency of await this.getDeps()) {
			let scope: string[];
			if (dependency.scope === undefined) {
				scope = [this.#scope];
			} else if (typeof dependency.scope === "string") {
				scope = [dependency.scope];
			} else if (Array.isArray(dependency.scope)) {
				({ scope } = dependency);
			} else {
				// deno-fmt-ignore
				throw new InvalidInput("invalid scope value, received: " + typeof dependency.scope);
			}
			if (this.shadowing) {
				scope.push("./");
			}
			scope.forEach(this.#joinWorkspace(importMap, dependency));
			if (dependency.importMap) {
				await this.#joinImportMap(importMap, dependency.importMap);
			}
		}
		if (stringify) {
			return JSON.stringify(importMap, null, "\t");
		}
		return importMap;
	}

	getDeps(): Promise<Dependency[]> {
		return Promise.all(this.#deps)
			.then((r) => r.sort((a, b) => a.name.localeCompare(b.name)));
	}

	async #dependencyFromRegistry(input: RegistryInput): Promise<Dependency> {
		const r: Registry = registries[input.registry];
		if (input.version === undefined) {
			input.version = await r.getLatest(input.name);
		}
		if (input.path === undefined) {
			input.path = "mod.ts";
		}
		if (input.server === undefined) {
			input.server = this.defaultServer[input.registry];
		}
		if (input.alias === undefined) {
			input.alias = input.name;
		}
		if (input.scope === undefined) {
			input.scope = this.#scope;
		}
		const dep: Dependency = await r.getDependency(input as Required<RegistryInput>);
		return dep;
	}

	scope(path: `./${string}`): this {
		this.#scope = path;
		return this;
	}

	add(dependency: Promise<Dependency> | Dependency | RegistryInput): this {
		if (isRegistryInput(dependency)) {
			dependency = this.#dependencyFromRegistry(dependency) as Promise<Dependency>;
		}
		this.#deps.push(dependency);
		return this;
	}

	npm(name: string): this {
		return this.add({
			registry: "npm",
			name,
		});
	}

	github(name: string): this {
		return this.add({
			registry: "github",
			name,
		});
	}

	std(name: string): this {
		return this.add({
			registry: "std",
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
