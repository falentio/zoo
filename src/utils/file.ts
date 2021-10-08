import * as path from "std/path/mod.ts";
import * as error from "/utils/error.ts";

async function offline(dir: string): Promise<string> {
	while (dir !== "/") {
		for await (const { name, isFile } of Deno.readDir(dir)) {
			if (
				isFile &&
				name === "zoo.yaml"
			) {
				return dir;
			}
		}
		dir = path.resolve(dir, "../");
	}
	throw new error.FileNotFound();
}

export function zooRoot(url: string | URL): Promise<string> {
	if (typeof url === "string") {
		url = new URL(url, "file://");
	}
	// TODO: Supporting Online Source
	if (url.protocol !== "file:") {
		throw new error.OnlineSource();
	}
	return offline(url.pathname);
}
