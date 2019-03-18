import functionDouble from "function-double";

import {createStrongStorage, createWeakStorage} from "./weakStorage";
import {WeakStorage} from "./types";

type WeakStorageCreator = () => WeakStorage;

const cacheStack: WeakStorage[] = [];
let cacheOverride: WeakStorage | undefined;

const pushCache = (cache: WeakStorage) => {
  cacheStack.push(cache);
  cacheOverride = cache;
};

const popCache = (cache: WeakStorage) => {
  if (cache !== cacheStack.pop()) {
    throw new Error('kashe synchronization failed')
  }
  cacheOverride = cacheStack[cacheStack.length - 1];
};

const addKashePrefix = (name: string) => `kashe-${name}`;

function weakMemoizeCreator(cacheCreator: WeakStorageCreator = createWeakStorage) {
  return function kasheCreator<Arg extends object, T extends any[], Return>
  (
    func: (x: Arg, ...rest: T) => Return,
    cache: WeakStorage = cacheCreator()
  ): (x: Arg, ...rest: T) => Return {
    return functionDouble((...args: any[]) => {
      const localCache = cacheOverride || cache;
      const test = localCache.get(args);
      if (test) {
        return test.value;
      }

      return localCache.set(
        args,
        // @ts-ignore
        func(...args)
      );
    }, func, {name: addKashePrefix as any});
  }
}

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

export const kashe = weakMemoizeCreator(createWeakStorage);
export const strongMemoize = weakMemoizeCreator(createStrongStorage);

export function swap<T, K, R>(fn: (t: T, k: K) => R): (k: K, T: T) => R {
  return (k: K, t: T) => fn(t, k)
}

type BoxedCall<T extends any[], K> = (state: object, ...rest: T) => K;

export function boxed<T extends any[], K>(fn: (...args: T) => K): BoxedCall<T, K> {
  return kashe((_, ...rest: T) => fn(...rest));
}

const localCacheCreator = kashe((_) => createWeakStorage());

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

export function fork<T extends any[], K>(fn: (...args: T) => K): (...args: T) => K {
  const cache = localCacheCreator({});
  return (...rest: T) => {
    try {
      pushCache(cache);
      return fn(...rest);
    } finally {
      popCache(cache);
    }
  }
}