if (import.meta.main) {
	// const { main } = await import("./cli/cli.ts")
	// await main()
	Deno.exit();
}

export * from "./core/registries.ts";
export * from "./core/error.ts";
export * from "./core/core.ts";

export type {
	Config,
	Dependency,
	ImportMap,
	Info,
	JsdelivrResponse,
	NestlandResponse,
	Registry,
	RegistryInput,
	RegistryName,
	RegistryServer,
	ZooOptions,
} from "./core/types.ts";
