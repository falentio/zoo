interface Registry {
	getInfo: (name: string) => Promise<Info>;
	getLatest: (name: string) => Promise<string>;
	getDependency: (input: Required<RegistryInput>) => Dependency | Promise<Dependency>;
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

interface BaseInput {
	registry: string;
	name: string;
	version?: string;
	path?: string;
	server?: string;
	alias?: string;
}

type RegistryInput = {
	[K in keyof RegistryServer]: {
		registry: K;
		name: string;
		version?: string;
		path?: string;
		server?: RegistryServer[K];
		alias?: string;
		workspace?: string | string[];
	};
}[keyof RegistryServer];

interface Dependency {
	// name of dependency
	name: string;
	// url to dependency file
	from: string;
	// url to dependency dir(optional, will resolved from folder of file)
	dir?: string;
	// import map of dependency
	importMap?: string;
	// directory that need this dependency, default to "./"
	workspace?: string | string[];
}

interface ImportMap {
	imports?: Record<string, string>;
	scopes?: Record<string, Record<string, string>>;
}

interface JsdelivrResponse {
	tags: Record<string, string | undefined>;
	versions: string[];
}

interface NestlandResponse {
	latestVersion: string;
	packageUploadNames: string[];
}

interface Info {
	latest: string;
	versions: string[];
}

interface Config {
	zooOptions?: ZooOptions;
	dependencies: (Dependency | RegistryInput)[];
}

interface ZooOptions {
	defaultServer?: Partial<RegistryServer>;
	// it will add on both "./" and "./*"
	workspaceShadowing?: boolean;
}

export type {
	Config,
	Dependency,
	ImportMap,
	Info,
	JsdelivrResponse,
	NestlandResponse,
	Registry,
	RegistryInput,
	RegistryName,
	RegistryServer,
	ZooOptions,
};
