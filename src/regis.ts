import ky from "ky";
import { join } from "path";

type IRegistry = (
	props: IProps<any>,
) => Promise<[string, string]> | [string, string];

interface IProps<S extends string> {
	name: string;
	version?: string;
	server: S;
	path?: string;
}

type NpmServer =
	| "esm.sh"
	| "skypack"
	| "jsdelivr"
	| "jspm";

const npmLatest = (name: string) =>
	ky
		.get(`https://data.jsdelivr.com/v1/package/npm/${name}`)
		.json<Record<string, any>>()
		.then((res: Record<string, any>) => res.tags.latest);

export const npm: IRegistry = async (props: IProps<NpmServer>) => {
	const {
		name,
		version = await npmLatest(name),
		server,
	} = props;
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
	return <[string, string]> [file, dir];
};

type GithubServer =
	| "raw"
	| "jsdelivr"
	| "statically";

export const githubLatest = (name: string) =>
	ky
		.get(`https://data.jsdelivr.com/v1/package/gh/${name}`)
		.json<Record<string, any>>()
		.then((res: Record<string, any>) => res.tags.latest);

export const github: IRegistry = async (props: IProps<GithubServer>) => {
	const {
		name,
		version = await githubLatest(name),
		server,
		path = "mod.ts",
	} = props;
	let dir: string;
	switch (server) {
		case "jsdelivr":
			dir = `https://cdn.jsdelivr.net/gh/${name}/${version}/`;
			break;
		case "statically":
			dir = `https://cdn.statically.io/gh/${name}/${version}/`;
			break;
		case "raw":
			dir = `https://raw.githubusercontent.com/${name}/${version}/`;
			break;
	}
	const file = join(dir, path);
	return <[string, string]> [file, dir];
};

export type { GithubServer, IProps, IRegistry, NpmServer };
