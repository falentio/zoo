interface ImportMap {
	imports?: Record<string, string>;
	scopes?: Record<string, Record<string, string>>;
}

interface Registry {
	getLatest: (name: string) => Promise<string>;
	getImportMap: (dependency: Required<Dependency>) => ImportMap;
}

type RegistryName =
	| "std"
	| "denoland"
	| "nestland"
	| "npm"
	| "github";

interface RegistryServer extends Record<RegistryName, string | null> {
	std: null;
	denoland: null;
	nestland: null;
	npm:
		| "esm.sh"
		| "skypack"
		| "jsdelivr"
		| "jspm";
	github:
		| "raw"
		| "jsdelivr"
		| "statically";
}

type IDependency<T extends RegistryServer> = {
	[K in keyof T]: {
		registry: K;
		name: string;
		version?: string;
		path?: string;
		server?: T[K];
		alias?: string;
	};
}[keyof T];

type Dependency = IDependency<RegistryServer>;

interface CustomDependency {
	name: string;
	from: string;
	importMap?: string | ImportMap;
}

interface JsdelivrResponse {
	tags: Record<string, string>;
	versions: string[];
}

interface NestlandResponse {
	latestVersion: string;
}

export type {
	CustomDependency,
	Dependency,
	ImportMap,
	JsdelivrResponse,
	NestlandResponse,
	Registry,
	RegistryName,
	RegistryServer,
};
