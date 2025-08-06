import {AsyncLocalStorage} from 'node:async_hooks';

import {CacheModel} from "./types.ts";
import {WeakStorage} from "../types.ts";

export const asyncLocalStorageModel = ():CacheModel => {
    const asyncCacheStorage = new AsyncLocalStorage<WeakStorage>();

    const getCacheOverride = () => asyncCacheStorage.getStore();

    return {
        createCacheScope: (cache, fn) => (
            asyncCacheStorage.run(cache, fn)
        ),
        getCacheFor: (fn, cacheCreator) => {
            const override = getCacheOverride();

            if (!override) {
                return;
            }

            const cache = override.get([fn]);

            if (cache) {
                return cache.value;
            }

            return override.set(
                [fn],
                cacheCreator()
            );
        }
    }
}