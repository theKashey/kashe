import {syncCacheModel} from './cache-models/sync-cache.ts'
import type {CacheModel} from "./cache-models/types.ts";
import type {Mappable, WeakStorage} from "./types.ts";
import {isWeakable} from "./utils.ts";

// default implementation
let cacheModelCreator = syncCacheModel;

// an object scope must not outlive its last user, so only primitive scopes are held strongly
let models = new Map<any, CacheModel>();
let weakModels = new WeakMap<object, CacheModel>();

/**
 * configures new cache model to use. Call it once, at startup:
 * the models in use are dropped, so a scope still open stops being seen
 * @param model
 */
export const configureCacheModel = (modelCreator: () => CacheModel) => {
    cacheModelCreator = modelCreator;
    models = new Map();
    weakModels = new WeakMap();
}

const getModel= (key:any = "__default"):CacheModel => {
    const store: Mappable<CacheModel> = isWeakable(key) ? weakModels : models;
    const known = store.get(key);

    if (known) {
        return known;
    }

    const model = cacheModelCreator();
    store.set(key, model);

    return model;
}

export const withCacheScope = <T>(key:any, cache: WeakStorage, fn: () => T) => getModel(key).createCacheScope(cache, fn);

export const getCacheFor = (key:any, fn: any, cacheCreator: () => WeakStorage) =>
    getModel(key).getCacheFor(fn, cacheCreator);