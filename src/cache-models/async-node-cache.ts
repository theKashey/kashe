// @ts-ignore - fix via platform update
import {AsyncLocalStorage} from 'async_hooks';
import {WeakStorage} from "../types";

const asyncCacheStorage = new AsyncLocalStorage();

const getCacheOverride = () => asyncCacheStorage.getStore();
export const asyncNodeCache = {
    withCacheScope: <T>(cache: WeakStorage, fn: () => T) => (
        asyncCacheStorage.run(cache, fn)
),
    getCacheOverride,
    getCacheFor: (fn: any, cacheCreator: () => WeakStorage) => {
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