import {syncCacheModel} from './cache-models/sync-cache.ts'
import {CacheModel} from "./cache-models/types.ts";
import {WeakStorage} from "./types.ts";

// default implementation
let cacheModelCreator = syncCacheModel;

const models = new Map<any, CacheModel>();

/**
 * configures new cache model to use
 * @param model
 */
export const configureCacheModel = (modelCreator: () => CacheModel) => {
    cacheModelCreator = modelCreator;
}

const getModel= (key:any = "__default"):CacheModel => {
    if (models.has(key)) {
        return models.get(key)!;
    }

    const model = cacheModelCreator();
    models.set(key, model);
 
    return model;
}

export const withCacheScope = <T>(key:any, cache: WeakStorage, fn: () => T) => getModel(key).createCacheScope(cache, fn);

export const getCacheFor = (key:any, fn: any, cacheCreator: () => WeakStorage) =>
    getModel(key).getCacheFor(fn, cacheCreator);