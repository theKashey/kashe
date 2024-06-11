import {WeakStorage} from "./types";
// default implementation
import {syncCache} from './cache-models/sync-cache'

let cacheModel = syncCache;

/**
 * configures new cache model to use
 * @param model
 */
export const configureCacheModel = (model: typeof syncCache) => {
    cacheModel = model;
}

export const withCacheScope = <T>(cache: WeakStorage, fn: () => T) => cacheModel.withCacheScope(cache, fn);

export const getCacheOverride = () => cacheModel.getCacheOverride();
export const getCacheFor = (fn: any, cacheCreator: () => WeakStorage) =>
    cacheModel.getCacheFor(fn, cacheCreator);