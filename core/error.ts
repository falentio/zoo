// just use error intanceof ZooError to catch error from zoo
export default class ZooError extends Error {}
export { ZooError };
export class FailedToFetch extends ZooError {}
export class InvalidInput extends ZooError {}
