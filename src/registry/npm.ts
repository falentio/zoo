import "urlpattern";
import { Registry } from "/registry/types.ts";
import ky from "ky";

interface VersionLists {
	tags: { [key: string]: string };
	versions: string[];
}

export type Server =
	| "jsdelivr"
	| "skypack"
	| "esm.sh"
	| "jspm";

function getVersionLists(pkg: string) {
	return ky.get(`https://data.jsdelivr.com/v1/package/npm/${pkg}`).json<
		VersionLists
	>();
}

function getLatest(pkg: string) {
	return getVersionLists(pkg)
		.then(({ tags: { latest } }: VersionLists) => latest);
}

async function getURL(server: Server, pkg: string, version?: string) {
	if (version === undefined) {
		version = await getLatest(pkg);
	}
	let file: string;
	switch (server) {
		case "jsdelivr":
			file = `https://cdn.jsdelivr.net/npm/${pkg}@${version}` as const;
			break;
		case "skypack":
			file = `https://cdn.skypack.dev/${pkg}@${version}?dts` as const;
			break;
		case "esm.sh":
			file = `https://esm.sh/${pkg}@${version}` as const;
			break;
		case "jspm":
			file = `https://ga.jspm.io/npm:${pkg}@${version}` as const;
			break;
	}
	const url = new URL(file);
	url.pathname = url.pathname + "/";
	const dir = url.href;
	return [file, dir, null];
}

const pattern = (url: string) => {
	const result = new URLPattern(
		"https://npmjs.com/package/:import/(v)?/:version?",
	).exec(url);
	if (result === null) {
		return null;
	}
	return {
		from: "npm",
		import: result.pathname.groups.import,
		version: result.pathname.groups.version,
	};
};

export default <Registry> {
	getURL,
	pattern,
};
