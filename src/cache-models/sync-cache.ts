import {WeakStorage} from "../types";
import {CacheModel} from "./types";

export const syncCacheModel = ():CacheModel => {
    const cacheStack: WeakStorage[] = [];
    let cacheOverride: WeakStorage | undefined;

    const pushCache = (cache: WeakStorage) => {
        cacheStack.push(cache);
        cacheOverride = cache;
    };

    const popCache = (cache: WeakStorage) => {
        const popped = cacheStack.pop();

        if (cache !== popped) {
            console.error({
                expected: cache,
                given: popped,
                stack: cacheStack,
            });

            throw new Error('kashe: cache synchronization failed, unexpected cache found on function exist. Something async?')
        }

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