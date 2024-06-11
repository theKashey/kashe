import {WeakStorage} from "../types";

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

const getCacheOverride= () => cacheOverride;

const isPromiseLike =(result:any):result is Promise<unknown> => (
    result &&
    typeof result === 'object' &&
    typeof result.then === 'function' &&
    typeof result.finally === 'function'
)

export const syncCache = {
    withCacheScope: <T>(cache: WeakStorage, fn: () => T) => {
        let result;
        try {
            pushCache(cache);
            result=fn();
            return result;
        } finally {
            // autocleanup dependences if either async or sync
            if (
                isPromiseLike(result)
            ) {
                result.finally(() => popCache(cache));
            } else {
                popCache(cache);
            }
        }
    },
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
};// as const;