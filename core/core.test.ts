import { Zoo } from "../mod.ts";

Deno.test("[ADD] from github", async () => {
	const zoo = new Zoo();
	zoo.add({
		registry: "github",
		name: "Falentio/jaran",
		server: "jsdelivr",
		alias: "jaran",
		version: "main",
	});
	const map = await zoo.getMap();
	console.log(map);
});

Deno.test("[ADD] from github with overwrite default server", async () => {
	const zoo = new Zoo();
	zoo.add({
		registry: "github",
		name: "Falentio/jaran",
		server: "statically",
		version: "main",
	});
	const map = await zoo.getMap();
	console.log(map);
});

Deno.test("[ADD] from npm", async () => {
	const zoo = new Zoo();
	zoo.add({
		registry: "npm",
		name: "ky",
		server: "skypack",
	});
	const map = await zoo.getMap();
	console.log(map);
});

Deno.test("[ADD] from std", async () => {
	const zoo = new Zoo();
	zoo.add({
		registry: "std",
		name: "path",
	});
	const map = await zoo.getMap();
	console.log(map);
});

Deno.test("[ADD] from denoland", async () => {
	const zoo = new Zoo();
	zoo.add({
		registry: "denoland",
		name: "oak",
	});
	const map = await zoo.getMap();
	console.log(map);
});

Deno.test("[ADD] from nestland", async () => {
	const zoo = new Zoo();
	zoo.add({
		registry: "nestland",
		name: "tinyhttp",
	});
	const map = await zoo.getMap();
	console.log(map);
});

Deno.test("[ADD] from raw url", async () => {
	const zoo = new Zoo();
	zoo.add({
		name: "aa",
		from: "https://deno.land/std/path/mod.ts",
	});
	const map = await zoo.getMap();
	console.log(map);
});

Deno.test("[ADD] from raw url with import map", async () => {
	const zoo = new Zoo();
	zoo.add({
		name: "zoo",
		from: "https://cdn.statically.io/gh/Falentio/zoo@dev/core/zoo.ts",
		importMap: "https://cdn.statically.io/gh/Falentio/zoo@dev/import-map.json",
	});
	const map = await zoo.getMap();
	console.log(map);
});

Deno.test("[ADD] using all possible input", async () => {
	const zoo = new Zoo({
		shadowing: false,
	});
	const map = await zoo
		.add({
			registry: "github",
			name: "Falentio/jaran",
			server: "jsdelivr",
			version: "main",
		})
		.add({
			registry: "github",
			name: "Falentio/jaran",
			server: "statically",
			version: "main",
			alias: "jaran",
		})
		.add({
			registry: "npm",
			name: "ky",
			server: "skypack",
		})
		.add({
			registry: "std",
			name: "path",
		})
		.add({
			registry: "denoland",
			name: "oak",
		})
		.add({
			registry: "nestland",
			name: "tinyhttp",
		})
		.add({
			name: "aa",
			from: "https://deno.land/std/path/mod.ts",
		})
		.add({
			name: "zoo",
			from: "https://cdn.statically.io/gh/Falentio/zoo@dev/core/zoo.ts",
			importMap: "https://cdn.statically.io/gh/Falentio/zoo@dev/import-map.json",
			scope: "./cli",
		})
		.getMap();
	console.log(map);
});

Deno.test("[ADD] in constructor", async () => {
	const zoo = new Zoo({
		dependencies: [{
			registry: "github",
			name: "Falentio/jaran",
			server: "jsdelivr",
			version: "main",
		}, {
			registry: "npm",
			name: "ky",
			server: "skypack",
			scope: "./cli",
		}],
	});
	console.log(await zoo.getMap());
});

Deno.test("[ADD] from raw url with scope", async () => {
	const zoo = new Zoo();
	zoo.add({
		name: "zoo",
		from: "https://cdn.statically.io/gh/Falentio/zoo@dev/core/zoo.ts",
		scope: "./cli",
	});
	const map = await zoo.getMap();
	console.log(map);
});
