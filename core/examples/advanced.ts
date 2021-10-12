// deno-fmt-ignore-file
import { Zoo } from "../../mod.ts";
import type { ZooOptions, ImportMap } from "../../mod.ts";

const defaultServer: ZooOptions["defaultServer"] = {
	npm: "esm.sh",
	github: "statically",
}

const dependencies: ZooOptions["dependencies"] = [{
	registry: "npm",
	name: "ky",
	server: "jsdelivr"
},{
	registry: "denoland",
	name: "oak",
	alias: "oak3"
}]

await new Zoo({ defaultServer, dependencies })
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
	.then((data: ImportMap) => { // not required to write types,just for readability for exmples
		console.log(data)
		// Deno.writeTextFileSync("import_map.json", JSON.stringify(data));
	});
