import type {
	Config,
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
	const json: Record<string, any> = JSON.parse(a);
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
			workspaceShadowing = true,
		} = opts;
		this.defaultServer = Object.assign({}, DEFAULT_SERVER, defaultServer);
		this.workspaceShadowing = workspaceShadowing;
	}
	static fromConfig(config: Config) {
		const zoo = new Zoo(config.zooOptions);
		for (const dependency of config.dependencies) {
			zoo.add(dependency);
		}
		return zoo;
	}
	defaultServer: RegistryServer;
	workspaceShadowing: boolean;
	#deps: (Dependency | Promise<Dependency>)[] = [];

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

	async getMap(): Promise<ImportMap> {
		const importMap: Required<ImportMap> = {
			imports: {},
			scopes: {},
		};
		for (const dependency of await this.getDeps()) {
			let workspace: string[];
			if (dependency.workspace === undefined) {
				workspace = ["./"];
			} else if (typeof dependency.workspace === "string") {
				workspace = [dependency.workspace];
			} else if (Array.isArray(dependency.workspace)) {
				workspace = dependency.workspace;
			} else {
				// deno-fmt-ignore
				throw new InvalidInput("invalid workspace value, received: " + typeof dependency.workspace);
			}
			if (this.workspaceShadowing) {
				workspace.push("./");
			}
			workspace.forEach(this.#joinWorkspace(importMap, dependency));
			if (dependency.importMap) {
				await this.#joinImportMap(importMap, dependency.importMap);
			}
		}
		return importMap;
	}

	getDeps(): Promise<(Dependency)[]> {
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
		if (input.workspace === undefined) {
			input.workspace = "./";
		}
		const dep: Dependency = await r.getDependency(input as Required<RegistryInput>);
		return dep;
	}

	add(dependency: Promise<Dependency> | Dependency | RegistryInput): this {
		if (isRegistryInput(dependency)) {
			dependency = this.#dependencyFromRegistry(dependency) as Promise<Dependency>;
		}
		this.#deps.push(dependency);
		return this;
	}
}
