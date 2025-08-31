import {getCacheFor, withCacheScope} from "./cache.ts";
// removed "in" until it's ESM compatible
import {functionDouble} from "./function-double.ts";
import type {WeakStorage} from "./types.ts";
import {isWeakable, Stringify} from "./utils";
import {createWeakStorage} from "./weakStorage.ts";

type WeakStorageCreator = () => WeakStorage;

/**
 * Configuration interface for kashe serialization behavior.
 * Allows custom transformation of cached values for advanced use cases like TTL, compression, or validation.
 *
 * @template T - The original function return type
 * @template K - The serialized storage type
 *
 * @example
 * ```ts
 * // TTL serializer example
 * const ttlSerializer: KasheSerializer<any, {value: any, expires: number}> = {
 *   writeTo: (value) => ({ value, expires: Date.now() + 60000 }),
 *   readFrom: (entry) => Date.now() < entry.expires ? entry.value : undefined
 * };
 *
 * const withTTL = kashe(expensiveFunction, { serializer: ttlSerializer });
 * ```
 */
export type KasheSerializer<T = unknown, K = T> = {
    /**
     * Transforms the function result before storing in cache.
     * Use this to add metadata, compress data, or perform any pre-storage transformation.
     *
     * @param input - The original function return value
     * @returns The value to store in cache
     * @default Identity function (input => input)
     *
     * @example
     * ```ts
     * writeTo: (result) => ({
     *   value: result,
     *   timestamp: Date.now(),
     *   compressed: compress(result)
     * })
     * ```
     */
    writeTo?(input: T): K;

    /**
     * Transforms the cached value when retrieving from cache.
     * Return `undefined` to indicate cache miss (e.g., for expired entries).
     *
     * @param input - The stored cache value
     * @returns The value to return to caller, or undefined for cache miss
     *
     * @example
     * ```ts
     * readFrom: (entry) => {
     *   if (Date.now() > entry.expires) return undefined; // Expired
     *   return decompress(entry.compressed);
     * }
     * ```
     */
    readFrom(input: K): T | undefined;
}
export type WeakOptions<Return, Serialized> = {
    /**
     * specifies a cache resolved. Can be used to create "independent slices" of the cache.
     * If not specified, a single slice is used.
     */
    resolver?: () => object;
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

const DEFAULT_SLICE = {[Symbol('kashe-default-slice')]:true};
const getDefaultSlice = () => DEFAULT_SLICE;

let generation = {[Symbol('kashe-generation')]: true};

/**
 * Resets all caches created by `kashe` and its derivatives.
 * @example
 * ```ts
 * import {resetKashe} from 'kashe'
 * // clear all caches
 * afterEach(() => {
 *   resetKashe();
 * });
 * ```
 */
export const resetKashe = () => {
    generation = {[Symbol('kashe-generation')]: true};
}

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
            const resolvedTo = resolver();

            const resolved = Array.isArray(resolvedTo) ? resolvedTo : [resolvedTo];

            if(!resolved.some(isWeakable)){
                console.error('incorrect resolver value', resolvedTo);
                throw new Error('kashe: resolver must return a non-primitive value. If it returns an array, at least one value must be non-primitive.');
            }


            const thisArgs = [generation, this, ...resolved, ...usedArgs];
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
                {
                    limit,
                    UNSAFE_allowNoWeakKeys,
                    minimalWeakArguments: 3/* generation + resolver + arg*/,
                    shouldCheckWeakArguments:
                        options.UNSAFE_allowNoWeakKeys === false ||
                        localCache === defaultCache && resolver == getDefaultSlice
                }
            );

            return result;
        }, func, {name: `kashe-${func.name || 'anonymous'}`});
    }
}

/**
 * Weak memoization helper that stores cached results inside the arguments themselves using WeakMap.
 *
 * Unlike traditional memoization, kashe requires at least one argument to be a non-primitive value
 * (object, function, array, symbol) to store the cache, preventing memory leaks through automatic
 * garbage collection when arguments are no longer referenced.
 *
 * Perfect for React selectors, computed properties, and any function where you want memory-safe caching
 * without global state pollution.
 *
 * @param func - The function to memoize
 * @param options - Configuration options for caching behavior
 * @returns A memoized version of the function with the same signature
 *
 * @see https://github.com/theKashey/kashe#kashe
 * @see {@link boxed} for functions with only primitive arguments
 * @see {@link weakKashe} for relaxed argument comparison
 *
 * @example
 * ```ts
 * // Basic usage - requires at least one object/array/function argument
 * const selector = kashe((state, filter) => state.items.filter(filter));
 *
 * // With resolver for per-request isolation
 * const perRequestCache = kashe(
 *   (data) => processData(data),
 *   { resolver: () => currentRequest }
 * );
 *
 * // React.cache replacement with UNSAFE_allowNoWeakKeys
 * const ReactCache = (fn) => kashe(fn, {
 *   resolver: () => renderContext,
 *   UNSAFE_allowNoWeakKeys: true,
 *   limit: 100 // Recommended for safety
 * });
 *
 * // With TTL using serializer
 * const withTTL = kashe(fn, {
 *   serializer: {
 *     writeTo: (value) => ({ value, expires: Date.now() + 60000 }),
 *     readFrom: (entry) => Date.now() < entry.expires ? entry.value : undefined
 *   }
 * });
 * ```
 */
export const kashe = weakMemoizeCreator(createWeakStorage);

/**
 * A special version of {@link kashe} which uses string comparison for specified argument positions.
 * Requires at least one argument to be a non-primitive value for weak mapping.
 *
 * This allows bypassing strict equality checks for selected arguments by comparing their string representations.
 * Useful when you need to cache based on function content or other values that change references but not semantics.
 *
 * ⚠️ Use with caution - string comparison can lead to unexpected cache hits if different values stringify to the same result.
 *
 * @param indexes - Array of argument positions (0-based) to compare using string representation instead of strict equality
 * @returns A function that creates memoized versions with relaxed argument comparison
 *
 * @see https://github.com/theKashey/kashe#weakkashe
 * @example
 * ```ts
 * // Compare second argument (index 1) by string representation
 * const weakMap = weakKashe([1])((data, iterator, ...deps) => data.map(iterator));
 *
 * // These will be treated as the same despite different function references:
 * const result1 = weakMap(data, x => x * 2, localVar);  // Cache miss - first call
 * const result2 = weakMap(data, x => x * 2, localVar);  // Cache hit - same string representation
 * const result3 = weakMap(data, y => y * 2, localVar);  // Cache miss - different var name so different string
 * ```
 */
export const weakKashe = (indexes: number[]) => {
    if (!Array.isArray(indexes)) {
        throw new Error('weakKashe requires an array of indexes to use as a weak keys');
    }

    return weakMemoizeCreator(createWeakStorage, (arg, i) => indexes.includes(i) ? Stringify(arg) : arg);
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
export function boxed<Args extends any[], Return, Serialized = Return>(fn: (...args: Args) => Return, options?: WeakOptions<Return, Serialized>): BoxedCall<Args, Return> {
    // we just placing an extra argument at the beginning and instantly removing it
    return kashe((_, ...rest: Args) => fn(...rest), options);
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
 * @see {@link inboxed} for argument based cache separation
 * @see {@link withKasheIsolation} to just "fork" cache scope
 * @see https://github.com/theKashey/kashe#fork
 */
export function fork<T extends any[], K>(
    fn: (...args: T) => K,
    {singleton = false, pointer = {}, scope}: {
        /**
         * forces single variant for all internal cache calls
         */
        singleton?: boolean;
        scope?: any;
        /**
         * pointer to the "cache". Similar objects points to similar caches.
         */
        pointer?: any;
    } = {},
): (...args: T) => K {
    const cache = localCacheCreator(pointer);
    const genLocalCache = () => localCacheCreator({});

    return (...rest: T) => {
        const cacheOverride = (!singleton ? getCacheFor(scope, cache, genLocalCache) : null) || cache;

        return withCacheScope(scope, cacheOverride, () => fn(...rest))
    }
}

/**
 * Starts a new isolated cache scope for all `kashe` calls made within the provided function.
 *
 * This creates a completely separate cache context, ensuring that all memoized functions
 * called inside the provided function use their own isolated cache space. Perfect for
 * per-request isolation in servers, test isolation, or any scenario where you need
 * guaranteed cache separation.
 *
 * When combined with `UNSAFE_allowNoWeakKeys`, this enables React.cache-like behavior
 * with proper isolation between different execution contexts.
 *
 * @param fn - The function to execute within the isolated cache scope
 * @param options - Configuration options for the cache scope
 * @returns The result of executing the provided function
 *
 * @see {@link inboxed} for argument-based cache separation
 * @see {@link fork} for creating isolated function variants
 * @see https://github.com/theKashey/kashe#withKasheIsolation
 *
 * @example
 * ```ts
 * // Server-side per-request isolation
 * app.get('/api/data', (req, res) => {
 *   withKasheIsolation(() => {
 *     // All kashe calls inside get their own cache per request
 *     const result = processExpensiveData(req.params);
 *     res.json(result);
 *   });
 * });
 *
 * // Test isolation - each test gets clean cache
 * test('should calculate correctly', () => {
 *   withKasheIsolation(() => {
 *     const result = expensiveCalculation(testData);
 *     expect(result).toBe(expectedValue);
 *   });
 * });
 *
 * // React.cache replacement pattern
 * const ReactCache = (fn) => kashe(fn, {
 *   resolver: () => renderContext,
 *   UNSAFE_allowNoWeakKeys: true
 * });
 *
 * // Use in server component
 * withKasheIsolation(() => {
 *   const data = ReactCache(fetchData)(userId);
 *   return <UserProfile data={data} />;
 * });
 * ```
 */
export function withKasheIsolation<K>(fn: () => K, {scope, pointer = {}}: {
    scope?: any,
    /**
     * pointer to the "cache". Similar objects points to similar caches.
     */
    pointer?: any
} = {}): K {
    const cache = localCacheCreator(pointer);
    const genLocalCache = () => localCacheCreator(pointer);
    const cacheOverride = getCacheFor(scope, cache, genLocalCache) || cache;

    return withCacheScope(scope, cacheOverride, fn)
}