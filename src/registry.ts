import ky from "ky";

export interface IProps {
	name: string;
	version: string;
	path?: string;
}

export interface IRegistry<T extends string | undefined> {
	props: IProps;
	getURL(server: T | undefined): Promise<[string, string, string | null]>;
	// create(name: string, version?: string): any;
	// pattern(url: string): {from: string, import: string, version?: string} | void
}

export interface ICreate {
	(props: IProps): IRegistry<string> | Promise<IRegistry<string>>;
}

export type NpmServers =
	| "esm.sh"
	| "skypack"
	| "jsdelivr"
	| "jspm";

interface JsdelivrResponse {
	tags: { [key: string]: string };
	versions: string[];
}

export class Npm implements IRegistry<NpmServers> {
	static getLatest(name: string) {
		return ky
			.get(`https://data.jsdelivr.com/v1/package/npm/${name}`)
			.json<JsdelivrResponse>()
			.then((res: JsdelivrResponse) => res.tags.latest);
	}

	props: Omit<IProps, "path">;

	constructor(props: Omit<IProps, "path">) {
		this.props = props;
	}

	async getURL(server: NpmServers) {
		let {
			version,
			name,
		} = this.props;
		if (version === undefined) {
			version = await Npm.getLatest(name);
		}
		let file: string;
		switch (server) {
			case "jsdelivr":
				file = `https://cdn.jsdelivr.net/npm/${name}@${version}`;
				break;
			case "skypack":
				file = `https://cdn.skypack.dev/${name}@${version}?dts`;
				break;
			case "esm.sh":
				file = `https://esm.sh/${name}@${version}`;
				break;
			case "jspm":
				file = `https://ga.jspm.io/npm:${name}@${version}`;
				break;
		}
		const url = new URL(file);
		url.pathname = url.pathname + "/";
		const dir = url.href;
		return <[string, string, string | null]> [file, dir, null];
	}
}

export const npm: ICreate = async (props: Omit<IProps, "path">) => {
	props.version = props.version || (await Npm.getLatest(props.name));
	return new Npm(props);
};

export class Std implements IRegistry<undefined> {
	props: IProps;

	constructor(props: IProps) {
		this.props = props;
	}

	async getURL() {
		const {
			path,
			version,
			name,
		} = this.props;
		let url = `https://deno.land/std@${version}/${name}`;
		if (path !== undefined) {
			url += `/${path}`;
		}
		return <[string, string, null]> [url, url + "/", null];
	}
}

export const std: ICreate = (props: IProps) => new Std(props);

export type GithubServer =
	| "jsdelivr"
	| "statically"
	| "raw";

export class Github implements IRegistry<GithubServer> {
	static async getLatest(name: string) {
		return ky
			.get(`https://data.jsdelivr.com/v1/package/gh/${name}`)
			.json<JsdelivrResponse>()
			.then((res: JsdelivrResponse) => res.tags.latest);
	}

	props: IProps;
	constructor(props: IProps) {
		this.props = props;
	}
	async getURL(server: GithubServer) {
		let {
			version,
			name,
			path,
		} = this.props;
		let url: string;
		switch (server) {
			case "jsdelivr":
				url = `https://cdn.jsdelivr.net/gh/${name}/${version}/${path}`;
				break;
			case "statically":
				url = `https://cdn.statically.io/gh/${name}/${version}/${path}`;
				break;
			case "raw":
				url = `https:?/raw.githubusercontent.com/${name}/${version}/${path}`;
				break;
		}
		return <[string, string, null]> [url, url + "/", null];
	}
}

export const github: ICreate = async (props: IProps) => {
	props.version = props.version || (await Github.getLatest(props.name));
	return new Github(props);
};
