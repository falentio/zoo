// deno-fmt-ignore-file
// usage "DENO_ENV="production" deno run --allow-net --allow-env dev.ts"
import { Zoo } from "../../mod.ts";

const prod = new Zoo()
	.std("path") 
	.npm("js-yaml")
	.github("oakserver/oak") 
	.denoland("cliffy") 
	// I know if cliffy entrypoint not in cliffy/mod.ts,
	// but still added to import map,
	// so you can edit it easily,
	// like add the exact path, or delete with ^X

const dev = Zoo
	.extend(prod)
	.std("color")
	.nestland("tinyhttp")
	.npm("ky")
	.npm("ejs")

const PRODUCTION = Deno.env.get("DENO_ENV") === "production"

await (PRODUCTION ? prod : dev)
	.getMap(true)
	.then(console.log)