import yaml from "yaml";
import ky from "ky";
import { z } from "zod";
import type { GithubServer, IProps, IRegistry, NpmServer } from "./regis.ts";
import { github, npm } from "./regis.ts";

const registries: Record<string, IRegistry> = {
	github,
	npm,
};

const validatorServer = z.object({
	npm: z.enum([
		"esm.sh",
		"skypack",
		"jsdelivr",
		"jspm",
	]).default("esm.sh"),
	github: z.enum([
		"raw",
		"jsdelivr",
		"statically",
	]).default("raw"),
});

const validatorDeps = z.object({
	github: z.record(z.record(z.any())),
	npm: z.record(z.record(z.any())),
});

const validatorProps = z.object({
	path: z.string().optional(),
	name: z.string(),
	version: z.string().optional(),
	server: z.string(),
	alias: z.string().optional(),
});

export const parse = async (txt: string) => {
	const obj = yaml.parse(text);
	const default_server: z.infer<typeof validatorServer> = validatorServer.parse(
		obj.default_server,
	);
	const deps: z.infer<typeof validatorDeps> = validatorDeps.parse(obj.deps);
	let imap: Record<string, Record<string, string>> = { import: {}, scopes: {} };
	for (const [registry, pkg] of Object.entries(deps)) {
		for (const [name, data] of Object.entries(pkg)) {
			const props: z.infer<typeof validatorProps> = validatorProps.parse({
				server: default_server[registry],
				name,
				...data,
			});
			imap.import[props.alias || props.name] = await registries[registry](
				props as IProps<any>,
			);
		}
	}
	console.log(imap);
};

const text = await Deno.readTextFile("/home/kevinf/projects/deno/zoo/zoo.yaml");
const config = yaml.parse(text);

parse(config);
