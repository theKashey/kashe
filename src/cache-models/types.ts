import {WeakStorage} from "../types";

export type CacheModel = {
    createCacheScope<T>(cache: WeakStorage, fn: () => T):T,
    getCacheFor(fn: any, cacheCreator: () => WeakStorage): WeakStorage | undefined;
}