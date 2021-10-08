import type {
	Dependency,
	ImportMap,
	JsdelivrResponse,
	NestlandResponse,
	Registry,
} from "./types.ts";
import * as path from "path";

const std = new class implements Registry {
	#latest?: string = undefined;
	async getLatest(_name: string): Promise<string> {
		if (this.#latest !== undefined) {
			return this.#latest;
		}
		const response = await fetch("https://deno.land/std", {
			redirect: "manual",
		});
		const result = response.headers
			.get("location")
			?.split("@")[1]
			?.split("/")[0];
		if (result === undefined || response.status !== 302) {
			throw new Error("cannt get latest version from std");
		}
		return this.#latest = result;
	}
	getImportMap(dependency: Required<Dependency>): ImportMap {
		const dir =
			`https://deno.land/std@${dependency.version}/${dependency.name}/`;
		const file = path.join(dir, dependency.path).replace("/", "//");
		return <ImportMap> {
			imports: {
				[dependency.alias]: file,
				[dependency.alias + "/"]: dir,
			},
		};
	}
}();

const github = new class implements Registry {
	async getLatest(name: string): Promise<string> {
		try {
			const response = await fetch(
				`https://data.jsdelivr.com/v1/package/gh/${name}`,
			);
			if (response.status !== 200) {
				throw new Error();
			}
			const json = await response.json() as JsdelivrResponse;
			return json.versions[0];
		} catch {
			throw new Error(
				`cannt get latest version of ${name} from npm`,
			);
		}
	}
	#dir<T>(dependency: Required<Dependency>): string {
		switch (dependency.server) {
			case "jsdelivr":
				return `https://cdn.jsdelivr.net/gh/${dependency.name}/${dependency.version}/`;
			case "statically":
				return `https://cdn.statically.io/gh/${dependency.name}/${dependency.version}/`;
			case "raw":
				return `https://raw.githubusercontent.com/${dependency.name}/${dependency.version}/`;
			default:
				throw new Error(
					`invalid server for ${dependency.name} at github`,
				);
		}
	}
	getImportMap(dependency: Required<Dependency>): ImportMap {
		const dir = this.#dir(dependency);
		const file = path.join(dir, dependency.path).replace("/", "//");
		return <ImportMap> {
			imports: {
				[dependency.alias]: file,
				[dependency.alias + "/"]: dir,
			},
		};
	}
}();

const npm = new class implements Registry {
	async getLatest(name: string): Promise<string> {
		try {
			const response = await fetch(
				`https://data.jsdelivr.com/v1/package/npm/${name}`,
			);
			const json = await response.json() as JsdelivrResponse;
			if (response.status !== 200) {
				throw new Error();
			}
			return json.tags.latest || json.versions[0];
		} catch {
			throw new Error(
				`cannt get latest version of ${name} from npm`,
			);
		}
	}
	#file(dependency: Required<Dependency>): string {
		switch (dependency.server) {
			case "jsdelivr":
				return `https://cdn.jsdelivr.net/npm/${dependency.name}@${dependency.version}`;
			case "skypack":
				return `https://cdn.skypack.dev/${dependency.name}@${dependency.version}?dts`;
			case "esm.sh":
				return `https://esm.sh/${dependency.name}@${dependency.version}`;
			case "jspm":
				return `https://ga.jspm.io/npm:${dependency.name}@${dependency.version}`;
			default:
				throw new Error(`invalid server for ${dependency.name} at npm`);
		}
	}
	getImportMap(dependency: Required<Dependency>): ImportMap {
		const file = this.#file(dependency);
		const url = new URL(file);
		url.pathname += "/";
		const dir = url.href;
		return <ImportMap> {
			imports: {
				[dependency.alias]: file,
				[dependency.alias + "/"]: dir,
			},
		};
	}
}();

const denoland = new class implements Registry {
	async getLatest(name: string): Promise<string> {
		const response = await fetch("https://deno.land/x/" + name, {
			redirect: "manual",
		});
		const result = response.headers
			.get("location")
			?.split("@")[1]
			?.split("/")[0];
		if (result === undefined || response.status !== 302) {
			throw new Error(
				`cannt get latest version of ${name} from denoland`,
			);
		}
		return result;
	}
	getImportMap(dependency: Required<Dependency>): ImportMap {
		const dir =
			`https://deno.land/x/${dependency.name}@${dependency.version}/`;
		const file = path.join(dir, dependency.path).replace("/", "//");
		return <ImportMap> {
			imports: {
				[dependency.alias]: file,
				[dependency.alias + "/"]: dir,
			},
		};
	}
}();

const nestland = new class implements Registry {
	async getLatest(name: string): Promise<string> {
		try {
			const response = await fetch(
				`https://x.nest.land/api/package/${name}`,
			);
			const json = await response.json() as NestlandResponse;
			return json.latestVersion.split("@")[1];
		} catch {
			throw new Error(
				`cannt get latest version of ${name} from nestland`,
			);
		}
	}
	getImportMap(dependency: Required<Dependency>): ImportMap {
		const dir =
			`https://x.nest.land/${dependency.name}@${dependency.version}/`;
		const file = path.join(dir, dependency.path).replace("/", "//");
		return <ImportMap> {
			imports: {
				[dependency.alias]: file,
				[dependency.alias + "/"]: dir,
			},
		};
	}
}();

export { denoland, github, nestland, npm, std };
