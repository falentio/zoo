import type {
	Dependency,
	Info,
	JsdelivrResponse,
	NestlandResponse,
	Registry,
	RegistryInput,
} from "./types.ts";

import { FailedToFetch, InvalidInput } from "./error.ts";

export const std: Registry = new class implements Registry {
	#Info: undefined | Info = undefined;
	async getInfo(_name: string): Promise<Info> {
		if (this.#Info !== undefined) {
			return this.#Info;
		}
		const response = await fetch("https://cdn.deno.land/std/meta/versions.json", {
			headers: {
				"User-Agent": "https://github.com/Falentio/zoo",
			},
		});
		const json = <Info> await response.json();
		return this.#Info = json;
	}
	async getLatest(_name: string): Promise<string> {
		const { latest } = await this.getInfo(_name);
		return latest;
	}
	getDependency(input: Required<RegistryInput>): Dependency {
		const dir = `https://deno.land/std@${input.version}/${input.name}/`;
		const file = new URL(input.path, dir).href;
		return <Dependency> {
			name: input.alias,
			from: file,
			scope: input.scope,
			dir,
		};
	}
}();

export const github: Registry = new class implements Registry {
	async getInfo(name: string): Promise<Info> {
		const response = await fetch(`https://data.jsdelivr.com/v1/package/gh/${name}`, {
			headers: {
				"User-Agent": "https://github.com/Falentio/zoo",
			},
		});
		const { tags, versions } = <JsdelivrResponse> await response.json();
		const latest = tags.latest || versions[0];
		if (latest === undefined) {
			throw new FailedToFetch(`cannt find latest version of ${name} from github`);
		}
		return <Info> {
			latest,
			versions,
		};
	}
	async getLatest(name: string): Promise<string> {
		const { latest } = await this.getInfo(name);
		return latest;
	}
	#dir<T>(input: Required<RegistryInput>): string {
		switch (input.server) {
			case "jsdelivr":
				return `https://cdn.jsdelivr.net/gh/${input.name}@${input.version}/`;
			case "statically":
				return `https://cdn.statically.io/gh/${input.name}@${input.version}/`;
			case "raw":
				return `https://raw.githubusercontent.com/${input.name}/${input.version}/`;
			default:
				throw new InvalidInput(
					`invalid server for ${input.name} at github, received: '${input.server}'`,
				);
		}
	}
	getDependency(input: Required<RegistryInput>): Dependency {
		const dir = this.#dir(input);
		const file = new URL(input.path, dir).href;
		return <Dependency> {
			name: input.alias,
			from: file,
			scope: input.scope,
			dir,
		};
	}
}();

export const npm: Registry = new class implements Registry {
	async getInfo(name: string): Promise<Info> {
		const response = await fetch(`https://data.jsdelivr.com/v1/package/npm/${name}`, {
			headers: {
				"User-Agent": "https://github.com/Falentio/zoo",
			},
		});
		const { tags, versions } = <JsdelivrResponse> await response.json();
		const latest = tags.latest || versions[0];
		if (latest === undefined) {
			throw new FailedToFetch(`cannt find latest version of ${name} from npm`);
		}
		return <Info> {
			latest,
			versions,
		};
	}
	async getLatest(name: string): Promise<string> {
		const { latest } = await this.getInfo(name);
		return latest;
	}
	#file(input: Required<RegistryInput>): string {
		switch (input.server) {
			case "jsdelivr":
				return `https://cdn.jsdelivr.net/npm/${input.name}@${input.version}`;
			case "skypack":
				return `https://cdn.skypack.dev/${input.name}@${input.version}?dts`;
			case "esm.sh":
				return `https://esm.sh/${input.name}@${input.version}`;
			case "jspm":
				return `https://ga.jspm.io/npm:${input.name}@${input.version}`;
			default:
				throw new InvalidInput(
					`invalid server for ${input.name} at npm, received: '${input.server}'`,
				);
		}
	}
	getDependency(input: Required<RegistryInput>): Dependency {
		const file = this.#file(input);
		const url = new URL(file);
		url.pathname += "/";
		const dir = url.href;
		return <Dependency> {
			name: input.alias,
			from: file,
			scope: input.scope,
			dir,
		};
	}
}();

export const denoland: Registry = new class implements Registry {
	async getInfo(name: string): Promise<Info> {
		const response = await fetch(`https://cdn.deno.land/${name}/meta/versions.json`, {
			headers: {
				"User-Agent": "https://github.com/Falentio/zoo",
			},
		});
		const json = <Info> await response.json();
		return json;
	}
	async getLatest(name: string): Promise<string> {
		const { latest } = await this.getInfo(name);
		return latest;
	}
	getDependency(input: Required<RegistryInput>): Dependency {
		const dir = `https://deno.land/x/${input.name}@${input.version}/`;
		const file = new URL(input.path, dir).href;
		return <Dependency> {
			name: input.alias,
			from: file,
			scope: input.scope,
			dir,
		};
	}
}();

export const nestland: Registry = new class implements Registry {
	async getInfo(name: string): Promise<Info> {
		const response = await fetch(`https://x.nest.land/api/package/${name}`, {
			headers: {
				"User-Agent": "https://github.com/Falentio/zoo",
			},
		});
		const { latestVersion: latest, packageUploadNames } = <NestlandResponse> await response
			.json();
		return <Info> {
			latest,
			versions: packageUploadNames.map((a: string) => a.split("@")[1] || a),
		};
	}
	async getLatest(name: string): Promise<string> {
		const { latest } = await this.getInfo(name);
		return latest;
	}
	getDependency(input: Required<RegistryInput>): Dependency {
		const dir = `https://x.nest.land/${input.name}@${input.version}/`;
		const file = new URL(input.path, dir).href;
		return <Dependency> {
			name: input.alias,
			from: file,
			scope: input.scope,
			dir,
		};
	}
}();
