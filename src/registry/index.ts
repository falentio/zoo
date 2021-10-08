import npm from "/registry/npm.ts";

const patterns = [
	["npm", npm.pattern],
];

function registryLookup(url: string) {
	for (const [registry, pattern] of patterns) {
		const result = pattern(url);
		if (result) {
			return {
				registry,
				result,
			};
		}
	}
}

console.log(registryLookup("https://npmjs.com/package/ky"));
