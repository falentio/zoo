import type {
	CustomDependency,
	Dependency,
	ImportMap,
	Registry,
	RegistryName,
	RegistryServer,
} from "./types.ts";
import { denoland, github, nestland, npm, std } from "./registries.ts";
import * as path from "path";

const registries: Record<RegistryName, Registry> = {
	denoland,
	nestland,
	github,
	std,
	npm,
};

// deno-lint-ignore no-explicit-any
function validateImportMap(a: any): a is ImportMap {
	if (
		a.imports !== undefined &&
		Object.entries(a).reduce((a, b) => a || typeof b[1] === "string", true)
	) {
		return true;
	}
	return false;
}

// deno-lint-ignore no-explicit-any
function sortEntries<T extends [string, any] = [string, any]>(
	a: T,
	b: T,
) {
	return a[0].localeCompare(b[0]);
}

function isCustomDeps(a: CustomDependency | Dependency): a is CustomDependency {
	if (
		(a as CustomDependency).name !== undefined &&
		(a as CustomDependency).from !== undefined &&
		Object.keys(a).length >= 2 &&
		Object.keys(a).length <= 3
	) {
		return true;
	}
	return false;
}

const defaultServer: RegistryServer = {
	npm: "esm.sh",
	github: "raw",
	std: null,
	nestland: null,
	denoland: null,
};

export class Zoo {
	constructor(
		custom: Partial<RegistryServer> = {},
	) {
		this.defaultServer = Object.assign({}, defaultServer, custom);
	}
	static create(custom: Partial<RegistryServer> = {}): Zoo {
		return new Zoo(custom);
	}
	defaultServer: RegistryServer;
	#deps: Array<Dependency | CustomDependency> = [];
	#map: Required<ImportMap> = {
		imports: {},
		scopes: {},
	};
	#pendingList: (Promise<void>)[] = [];

	async getMap(): Promise<ImportMap> {
		await Promise.all(this.#pendingList);
		const entries = [
			["./", this.#map.imports],
			...Object.entries(this.#map.scopes).sort(sortEntries),
		].map((a) => {
			a[1] = Object.fromEntries(
				Object.entries(a[1]).sort(sortEntries),
			);
			return a;
		});
		return <ImportMap> { scopes: Object.fromEntries(entries) };
	}

	async getDeps(): Promise<(Dependency | CustomDependency)[]> {
		await Promise.all(this.#pendingList);
		return this.#deps;
	}

	async #addDependency(dependency: Dependency): Promise<void> {
		const r: Registry = registries[dependency.registry];
		if (dependency.version === undefined) {
			dependency.version = await r.getLatest(dependency.name);
		}
		if (dependency.path === undefined) {
			dependency.path = "mod.ts";
		}
		if (dependency.server === undefined) {
			dependency.server = this.defaultServer[dependency.registry];
		}
		if (dependency.alias === undefined) {
			dependency.alias = dependency.name;
		}
		this.#deps.push(dependency);
		const { imports, scopes } = r.getImportMap(
			dependency as Required<Dependency>,
		);
		this.#map.imports = Object.assign({}, imports, this.#map.imports);
		this.#map.scopes = Object.assign({}, scopes, this.#map.scopes);
	}

	async #addCustomDependency(dependency: CustomDependency): Promise<void> {
		this.#deps.push(dependency);
		const dir = path.join(dependency.from, "../").replace("/", "//");
		this.#map.imports = Object.assign({
			[dependency.name]: dependency.from,
			[dependency.name + "/"]: dir,
		}, this.#map.imports);
		if (dependency.importMap === undefined) {
			return;
		}
		if (typeof dependency.importMap === "string") {
			const response = await fetch(dependency.importMap);
			const json: ImportMap | undefined = await response.json()
				.catch(() => {});
			if (json === undefined || response.status !== 200) {
				throw new Error(
					"cannt get import map from " + dependency.importMap,
				);
			}
			dependency.importMap = json;
		}
		if (!validateImportMap(dependency.importMap)) {
			throw new Error("invalid import map");
		}
		const scopes = {
			[dir]: dependency.importMap.imports,
		};
		this.#map.scopes = Object.assign(
			{},
			dependency.importMap.scopes,
			scopes,
			this.#map.scopes,
		);
	}

	add(dependency: Dependency | CustomDependency): this {
		if (isCustomDeps(dependency)) {
			this.#pendingList.push(this.#addCustomDependency(dependency));
		} else {
			this.#pendingList.push(this.#addDependency(dependency));
		}
		return this;
	}
}

const zoo = new Zoo();

const map = await zoo
	.add({
		registry: "github",
		name: "sindresorhus/ky",
		server: "jsdelivr",
	})
	.add({
		registry: "npm",
		name: "ky",
		server: "skypack",
	})
	.add({
		registry: "std",
		name: "path",
	})
	.add({
		registry: "denoland",
		name: "oak",
	})
	.add({
		registry: "nestland",
		name: "tinyhttp",
	})
	.add({
		name: "aa",
		from: "https://deno.land/std/path/mod.ts",
		importMap: {
			imports: {
				"c": "https://deno.land/std/color/mod.ts",
			},
			scopes: {
				"https://deno.land/std/color/": {
					s: "https://deno.land/std/node/mod.ts",
				},
			},
		},
	})
	.getMap();

console.log(map);
