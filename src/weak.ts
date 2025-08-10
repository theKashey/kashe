import functionDouble from "function-double";

import {getCacheFor, withCacheScope} from "./cache.ts";
import type {WeakStorage} from "./types.ts";
import {createWeakStorage} from "./weakStorage.ts";

type WeakStorageCreator = () => WeakStorage;

export type KasheSerializer<T = unknown, K = T> = {
    /**
     * used to transform input into a value stored in the cache
     * @default -> T => K
     */
    writeTo?(input: T): K;
    /**
     * used to transform valid from the cache into result, or reject to undefined
     * @param input
     */
    readFrom(input: K): T | undefined
}
export type WeakOptions<Return, Serialized> = {
    /**
     * specifies a cache resolved. Can be used to create "independent slices" of the cache.
     * If not specified, a single slice is used.
     */
    resolver?: () => object | symbol;
    /**
     * limits the number of non-primitive arguments stored in the cache.
     * there are no limits for weak references, and no way to even count them
     * however it is possible to limit the number of "primitive" arguments stored in the cache.
     * @default no limit
     */
    limit?: number;
    /**
     * ⚠️ unsafe option, which allows to use kashe without any weak-mappable arguments.
     * This is not recommended, as it can lead to memory leaks.
     * - Use only with `resolver` or other scoping mechanisms.
     * - Behavior is similar to `React.cache` or `Reselect v5`.
     * - Setting `limit` option is strongly advised when enabled.
     *
     * @default false
     */
    UNSAFE_allowNoWeakKeys?: boolean;
    /**
     * used to serialize and deserialize values stored in the cache.
     * can be used to store extra information or perform any other transformation.
     * A possible use case - limit TTL of the cached value by storing a timestamp and rejecting "old" values
     */
    serializer?: KasheSerializer<Return, Serialized>;
    /**
     * configures a scope for the cache.
     * caches with different scopes can existing in parallel without any interference.
     */
    scope?: any;
}

const DEFAULT_SLICE = Symbol('kashe-default-slice');
const getDefaultSlice = () => DEFAULT_SLICE;

export function weakMemoizeCreator(cacheCreator: WeakStorageCreator = createWeakStorage, mapper?: (x: any, index: number) => any) {
    /**
     * memoizes a function
     */
    return function kashe<Args extends any[], Return, Serialized = Return>
    (
        /**
         * function to memoize
         */
        func: (...args: Args) => Return,
        /**
         * extra options
         */
        options: WeakOptions<Return, Serialized> = {},
    ): (...args: Args) => Return {
        const {resolver = getDefaultSlice, limit, UNSAFE_allowNoWeakKeys, serializer} = options;
        const defaultCache = cacheCreator();
        const _this_ = {func};

        const readFrom = serializer?.readFrom || ((x) => x);
        const writeTo = serializer?.writeTo || ((x) => x);

        return functionDouble(function (this: any, ...args: any[]) {
            const localCache = getCacheFor(options.scope, _this_, cacheCreator) || defaultCache;
            const usedArgs = mapper ? args.map(mapper) : args;
            const thisArgs = [this, resolver(), ...usedArgs];
            const test = localCache.get(thisArgs);

            if (test) {
                const resultValue = readFrom(test.value);

                if (resultValue !== undefined || test.value === undefined) {
                    return resultValue;
                }
            }

            // @ts-expect-error TS2345: Argument of type any[] is not assignable to parameter of type [x: Arg, ...rest: T]
            const result = func.apply(this, args);

            localCache.set(
                thisArgs,
                writeTo(result),
                {limit, UNSAFE_allowNoWeakKeys}
            );

            return result;
        }, func, {name: `kashe-${func.name || 'anonymous'}`});
    }
}

/**
 * weak memoization helper.
 * Uses non-primitive arguments to store result. Thus NOT suitable for functions with "simple" argument. See {@link boxed} for such cases.
 *
 * `kashe`'s API is equal to any other single-line memoization library except the requirement for
 * some arguments to be an object (or a function).
 * @see https://github.com/theKashey/kashe#kashe
 * @example
 * ```ts
 * // create a selector, which returns a new array using `array.filter` every time
 * const unstableSelector = (array) => array.filter(somehow)
 * // make it return the same object for the same array called.
 * const stableSelector = kashe(badSelector);
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
 * const weakMap = weakKashe([1])((data, iterator, ...deps) => data.map(iterator));
 * const derived = weakMap(data, line => ({...line, somethingElse}), localVariable1);
 * // 👆 second argument is changing every time, but as long as it's __String representation__ is the same - result is unchanged.
 * ```
 */
export const weakKashe = (indexes: number[]) => {
    if (!Array.isArray(indexes)) {
        throw new Error('weakKashe requires an array of indexes to use as a weak keys');
    }

    return weakMemoizeCreator(createWeakStorage, (arg, i) => indexes.includes(i) ? String(arg) : arg);
}

function weakKasheFactory<T extends any[], Return>
(scope: any, func: (...rest: T) => Return, indexId: number = 0): (...rest: T) => Return {
    const cache = createWeakStorage();
    const key = {};

    return function kasheFactory(...args: any[]) {
        const localCache = getCacheFor(scope, key, createWeakStorage,) || cache;
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

type BoxedCall<T extends any[], K> = (state: object, ...rest: T) => K;

/**
 * Prepends a function with an additional argument, which would be used as a "box" key later.
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
 * // 👇 now function takes 3 arguments
 * bAddTwo(cacheKey, 1, 2) === bAddTwo(cacheKey, 1, 2) === 3
 * // result is "stored" in a first argument, using another key causes a new call
 * bAddTwo(otherCacheKey, 1, 2) // -> a new call
 */
export function boxed<T extends any[], K>(fn: (...args: T) => K): BoxedCall<T, K> {
    // we just placing an extra argument at the beginning and instantly removing it
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
 * @see {@link boxed} for non-nested and more explicit caches.
 * @see {@link fork} for "splitting" functions without prepending with an extra arg.
 * @see https://github.com/theKashey/kashe#inboxed
 * @example
 * ```ts
 * const kashedSelector = kashe((state) => ({state, counter: counter++})); // returns unique object every call
 * const inboxedSelector = inboxed(kashedSelector);
 *
 * // ✅using the same key returns the same object
 * kashedSelector(state) === kashedSelector(state)
 *
 * const cacheKey = {}; // any object
 * // ✅using the same key(s) returns the same object
 * inboxedSelector(cacheKey, state) === inboxedSelector(cacheKey, state)
 * // ✅ using different keys returns different objects
 * inboxedSelector({}, state) !== inboxedSelector({}, state)
 * ```
 */
export function inboxed<T extends any[], K>(fn: (...args: T) => K, scope?: any): BoxedCall<T, K> {
    const factory = weakKasheFactory(
        scope,
        cacheVariation => {
            const cache = localCacheCreator(cacheVariation);

            return (...rest: T) =>
                withCacheScope(scope, cache, () => fn(...rest))
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
export function fork<T extends any[], K>(fn: (...args: T) => K, options?: {
    singleton?: boolean,
    scope: any
}): (...args: T) => K {
    const cache = localCacheCreator({});
    const genLocalCache = () => localCacheCreator({});

    return (...rest: T) => {
        const cacheOverride = ((!options || !options.singleton) ? getCacheFor(options?.scope, cache, genLocalCache) : null) || cache;

        return withCacheScope(options?.scope, cacheOverride, () => fn(...rest))
    }
}

/**
 * Starts a new cache scope
 * @see {@link inboxed} and {@link fork} for other ways to create a new cache scope
 */
export function withIsolatedKashe<K>(fn: () => K, {scope, pointer = {}}: { scope?: any, pointer?: any } = {}): K {
    const cache = localCacheCreator(pointer);
    const genLocalCache = () => localCacheCreator(pointer);
    const cacheOverride = getCacheFor(scope, cache, genLocalCache) || cache;

    return withCacheScope(scope, cacheOverride, fn)
}