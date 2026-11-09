import type {WeakStorage} from "../types.ts";
import type {CacheModel} from "./types.ts";

export const syncCacheModel = ():CacheModel => {
    // one entry per open scope: overlapping scopes can share a cache, and each closes only its own
    const scopes: { cache: WeakStorage }[] = [];
    let cacheOverride: WeakStorage | undefined;

    const pushCache = (cache: WeakStorage) => {
        const scope = {cache};

        scopes.push(scope);
        cacheOverride = cache;

        return scope;
    };

    const popCache = (scope: { cache: WeakStorage }) => {
        // overlapping async scopes settle in any order, so the scope to close may not be the last one
        const index = scopes.indexOf(scope);

        // a thenable may settle twice, and the second close must not take another scope's entry
        if (index !== -1) {
            scopes.splice(index, 1);
            cacheOverride = scopes[scopes.length - 1]?.cache;
        }
    };

    const getCacheOverride = () => cacheOverride;

    const isPromiseLike = (result: any): result is Promise<unknown> => (
        result &&
        typeof result === 'object' &&
        typeof result.then === 'function'
    )

    return {
        createCacheScope: (cache, fn) => {
            const scope = pushCache(cache);
            let result;

            try {
                result = fn();

                return result;
            } finally {
                // autocleanup dependencies if either async or sync
                if (
                    isPromiseLike(result)
                ) {
                    result.then(() => popCache(scope), () => popCache(scope));
                } else {
                    popCache(scope);
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