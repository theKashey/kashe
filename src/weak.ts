import functionDouble from "function-double";

import {createWeakStorage} from "./weakStorage";
import {WeakStorage} from "./types";

type WeakStorageCreator = () => WeakStorage;

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
    };
    throw new Error('kashe synchronization failed')
  }
  cacheOverride = cacheStack[cacheStack.length - 1];
};

const addKashePrefix = (name: string) => `kashe-${name}`;

const getCacheFor = (fn: any, cacheCreator: () => WeakStorage) => {
  if (!cacheOverride) {
    return;
  }
  const cache = cacheOverride.get([fn]);
  if (cache) {
    return cache.value;
  }
  return cacheOverride.set(
    [fn],
    cacheCreator()
  );
};

export function weakMemoizeCreator(cacheCreator: WeakStorageCreator = createWeakStorage, mapper?: (x: any, index: number) => any) {
  /**
   * memoizes a function
   */
  return function kashe<Arg extends object, T extends any[], Return>
  (
    func: (x: Arg, ...rest: T) => Return,
    cache: WeakStorage = cacheCreator()
  ): (x: Arg, ...rest: T) => Return {
    const _this_ = {func};
    return functionDouble((...args: any[]) => {
      const localCache = getCacheFor(_this_, cacheCreator) || cache;
      const usedArgs = mapper ? args.map(mapper) : args;
      const test = localCache.get(usedArgs);
      if (test) {
        return test.value;
      }

      return localCache.set(
        usedArgs,
        // @ts-ignore
        func(...args)
      );
    }, func, {name: addKashePrefix as any});
  }
}

export const kashe = weakMemoizeCreator(createWeakStorage);
export const weakKashe = weakMemoizeCreator(createWeakStorage, (arg, i) => i > 0 ? String(arg) : arg);

function weakKasheFactory<T extends any[], Return>
(func: (...rest: T) => Return, indexId: number = 0): (...rest: T) => Return {
  const cache = createWeakStorage();

  return function kasheFactory(...args: any[]) {
    const localCache = cacheOverride || cache;
    const cacheArg = [args[indexId]];
    const test = localCache.get(cacheArg);
    if (test) {
      return test.value;
    }

    return localCache.set(
      cacheArg,
      // @ts-ignore
      func(...args)
    );
  }
}

export function swap<T, K, R>(fn: (t: T, k: K) => R): (k: K, T: T) => R {
  return (k: K, t: T) => fn(t, k)
}

type BoxedCall<T extends any[], K> = (state: object, ...rest: T) => K;

/**
 * Prepends function with an additional argument, which would be used as a "box" key layer
 * @param fn
 */
export function boxed<T extends any[], K>(fn: (...args: T) => K): BoxedCall<T, K> {
  return kashe((_, ...rest: T) => fn(...rest));
}

const localCacheCreator = kashe((_) => createWeakStorage());

/**
 * Prepends function with an additional argument, which would be used as "cache-dimension" key later
 * @param fn
 */
export function inboxed<T extends any[], K>(fn: (...args: T) => K): BoxedCall<T, K> {
  const factory = weakKasheFactory(
    cacheVariation => {
      const cache = localCacheCreator(cacheVariation);
      return (...rest: T) => {
        try {
          pushCache(cache);
          return fn(...rest);
        } finally {
          popCache(cache);
        }
      }
    }
  );

  return (_, ...rest: T) => factory(_)(...rest);
}

/**
 * Forks internal cache, creating another cache dimension
 * @param fn - function to memoize
 * @param [options]
 * @param [options.singleton=false] force single variant for an internal cache
 */
export function fork<T extends any[], K>(fn: (...args: T) => K, options?: { singleton?: boolean }): (...args: T) => K {
  const cache = localCacheCreator({});
  const genLocalCache = () => localCacheCreator({});
  return (...rest: T) => {
    const cacheOverride = ((!options || !options.singleton) ? getCacheFor(cache, genLocalCache) : null) || cache;
    try {
      pushCache(cacheOverride);
      return fn(...rest);
    } finally {
      popCache(cacheOverride);
    }
  }
}