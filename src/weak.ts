import functionDouble from "function-double";

import {createWeakStorage} from "./weakStorage";
import {WeakStorage} from "./types";
import {getCacheFor, getCacheOverride, withCacheScope} from "./cache";
import {addKashePrefix} from "./helpers";

type WeakStorageCreator = () => WeakStorage;


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
    return functionDouble(function (this:any, ...args: any[]) {
      const localCache = getCacheFor(_this_, cacheCreator) || cache;
      const usedArgs = mapper ? args.map(mapper) : args;
      const thisArgs = [this,...usedArgs];
      const test = localCache.get(thisArgs);
      if (test) {
        return test.value;
      }

      return localCache.set(
          thisArgs,
         // @ts-ignore
         func.apply(this,args)
      );
    }, func, {name: addKashePrefix as any});
  }
}

/**
 * weak memoization helper.
 * Uses non-primitive arguments to store result. Thus NOT suitable for functions with "simple" argument. See {@link boxed} for such cases.
 *
 * `kashe`'s API is equal to any other single-line memoization library except the requirement for
 * some arguments to be an object (or a function).
 **
 * @see https://github.com/theKashey/kashe#kashe
 * @example
 * ```ts
 * // create a selector, which returns a new array using `array.filter` every time
 * const badSelector = (array) => array.filter(somehow)
 * // make it return the same object for the same array called.
 * const goodSelector = kashe(badSelector);
 * ```
 */
export const kashe = weakMemoizeCreator(createWeakStorage);

/**
 * a special version of {@link kashe} which does not strictly checks arg1+.
 * Requires first argument to be a non-primitive value.
 * Could be used to bypass equality check, however use with ⚠️caution and for a good reason🧑‍🏭
 *
 * @see https://github.com/theKashey/kashe#weakkashe
 * @example
 * ```ts
 * const weakMap = weakKashe((data, iterator, ...deps) => data.map(iterator));
 * const derived = weakMap(data, line => ({...line, somethingElse}), localVariable1);
 * // 👆 second argument is changing every time, but as long as it's __String representation__ is the same - result is unchanged.
 * ```
 */
export const weakKashe = weakMemoizeCreator(createWeakStorage, (arg, i) => i > 0 ? String(arg) : arg);

function weakKasheFactory<T extends any[], Return>
(func: (...rest: T) => Return, indexId: number = 0): (...rest: T) => Return {
  const cache = createWeakStorage();

  return function kasheFactory(...args: any[]) {
    const localCache = getCacheOverride() || cache;
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
 * Prepends a single function with an additional argument, which would be used as a "box" key layer.
 * Literally "puts function in a box"
 *
 * @param {Function} fn - function to "box"
 *
 * @see https://github.com/theKashey/kashe#boxed
 * @see {@link inboxed} - for nested caches.
 *
 * @example
 * const addTwo = (a,b) => a+b; // could not be "kashe" memoized
 * const bAddTwo = boxed(addTwo); // "box" it
 * const cacheKey = {}; // any object
 * // 👇 not function takes 3 arguments
 * bAddTwo(cacheKey, 1, 2) === bAddTwo(cacheKey, 1, 2) === 3
 * // result is "stored in a first argument" - using another key equivalent to cache clear.
 * bAddTwo(otherCacheKey, 1, 2) // -> a new call
 */
export function boxed<T extends any[], K>(fn: (...args: T) => K): BoxedCall<T, K> {
  return kashe((_, ...rest: T) => fn(...rest));
}

const localCacheCreator = kashe((_) => createWeakStorage());

/**
 * Prepends with additional cache-key, which will be used for any other {@link kashe} call made inside.
 * inboxed scopes all the nested caches behind a first argument, creating a "sub cache".
 *
 * inboxed is about __isolation__. Or creating parallel caches.
 *
 * @param {Function} fn function to "box"
 *
 * @see {@link boxed} for non-nested caches.
 * @see https://github.com/theKashey/kashe#inboxed
 * @example
 * const kashedSelector = kashe((state) => ({state, counter: counter++})); // returns unique object every all
 * const inboxedSelector = inboxed(kashedSelector);
 *
 * ✅ kashedSelector(state) === kashedSelector(state)
 * const cacheKey = {}; // any object
 * 👉 inboxedSelector(cacheKey, state) === inboxedSelector(cacheKey, state)
 * ✅ inboxedSelector({}, state) !== inboxedSelector({}, state)
 */
export function inboxed<T extends any[], K>(fn: (...args: T) => K): BoxedCall<T, K> {
  const factory = weakKasheFactory(
    cacheVariation => {
      const cache = localCacheCreator(cacheVariation);
      return (...rest: T) =>
        withCacheScope(cache, () => fn(...rest))

    }
  );

  return (_, ...rest: T) => factory(_)(...rest);
}

/**
 * Creates a clone of a kash-ed function with another internal cache.
 * Useful for isolation one kashe call from another
 * @param fn - function to memoize
 * @param [options]
 * @param [options.singleton=false] force single variant for all internal cache calls
 *
 * @see {@link inboxed} for argument based cache separation
 * @see https://github.com/theKashey/kashe#fork
 */
export function fork<T extends any[], K>(fn: (...args: T) => K, options?: { singleton?: boolean }): (...args: T) => K {
  const cache = localCacheCreator({});
  const genLocalCache = () => localCacheCreator({});
  return (...rest: T) => {
    const cacheOverride = ((!options || !options.singleton) ? getCacheFor(cache, genLocalCache) : null) || cache;
    return withCacheScope(cacheOverride, () => fn(...rest))
  }
}