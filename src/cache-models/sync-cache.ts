import type {WeakStorage} from "../types.ts";
import type {CacheModel} from "./types.ts";

export const syncCacheModel = ():CacheModel => {
    const cacheStack: WeakStorage[] = [];
    let cacheOverride: WeakStorage | undefined;

    const pushCache = (cache: WeakStorage) => {
        cacheStack.push(cache);
        cacheOverride = cache;
    };

    const popCache = (cache: WeakStorage) => {
        // overlapping async scopes settle in any order, so the scope to close may not be the last one
        const index = cacheStack.lastIndexOf(cache);

        if (index === -1) {
            console.error({
                expected: cache,
                stack: cacheStack,
            });

            throw new Error('kashe: cache synchronization failed, unexpected cache found on function exist. Something async?')
        }

        cacheStack.splice(index, 1);
        cacheOverride = cacheStack[cacheStack.length - 1];
    };

    const getCacheOverride = () => cacheOverride;

    const isPromiseLike = (result: any): result is Promise<unknown> => (
        result &&
        typeof result === 'object' &&
        typeof result.then === 'function'
    )

    return {
        createCacheScope: (cache, fn) => {
            let result;

            try {
                pushCache(cache);
                result = fn();

                return result;
            } finally {
                // autocleanup dependencies if either async or sync
                if (
                    isPromiseLike(result)
                ) {
                    result.then(() => popCache(cache), () => popCache(cache));
                } else {
                    popCache(cache);
                }
            }
        },
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
    };
}