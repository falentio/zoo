import "urlpattern";
export interface Registry {
	getURL(
		server: string,
		pkg: string,
		version?: string,
	): Promise<[string, string, string | null]>;
	pattern(url: string): { from: string; import: string; version?: string };
}
