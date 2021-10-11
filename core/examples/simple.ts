// deno-fmt-ignore-file
import { Zoo } from "../../mod.ts";

await new Zoo()
	.std("path") // add module named path from std
	.npm("js-yaml") // add module named js-yml from npm
	.denoland("cliffy") // add module named cliffy from denoland
	.github("oakserver/oak") // add module from https://github.com/oakserver/oak
	.getMap(true) // set true to get stringified
	.then((data: string) => {
		console.log(data)
		// Deno.writeTextFileSync("import_map.json", data);
	});

// how with path to file? it will resolved to ./mod.ts except for npm
// how with version? it will try to get the latest version, when added from github and no realeases found, then it will not automatic selected branch
