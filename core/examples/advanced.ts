// deno-fmt-ignore-file
import { Zoo } from "../../mod.ts";
import type { DefaultServer } from "../../mod.ts";

const defaultServer: DefaultServer = {
	npm: "esm.sh",
	github: "statically",
}

await new Zoo({ defaultServer })
	.add({
		registry: "github",
		name: "oakserver/oak",
		server: "jsdelivr", // overwrite default server
		alias: "oak" // set name on import map
	})
	.add({
		registry: "npm",
		name: "ky",
		server: "skypack", // overwrite default server
	})
	.add({
		registry: "std",
		name: "path",
		version: "0.100.0", // specify the version
	})
	.add({
		registry: "denoland",
		name: "oak",
		alias: "oak2", // set name on import map, by default is same as package name
	})
	.add({
		registry: "nestland",
		name: "tinyhttp",
		path: "./utils/etag.ts" // specify path of file
	})
	.add({
		// add from raw url
		name: "aa",
		from: "https://deno.land/std/path/mod.ts",
	})
	.getMap()
	.then((data) => {
		console.log(data)
		// Deno.writeTextFileSync("import_map.json", data);
	});
