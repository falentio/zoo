// deno-fmt-ignore-file
// usage "deno run --allow-net dev_2.ts production"
import { Zoo } from "../../mod.ts";

const prod = new Zoo()
	.std("path") 
	.npm("js-yaml") 
	.denoland("cliffy") 
	.github("oakserver/oak") 

const dev = Zoo
	.extend(prod)
	.std("color")
	.nestland("tinyhttp")
	.npm("ky")
	.npm("ejs")

const PRODUCTION = Deno.args[0] === "production"

await (PRODUCTION ? prod : dev)
	.getMap(true)
	.then(console.log)