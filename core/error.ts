// just use error intanceof ZooError to catch error from zoo
export class ZooError extends Error {}
export class FailedToFetch extends ZooError {}
export class InvalidInput extends ZooError {}
