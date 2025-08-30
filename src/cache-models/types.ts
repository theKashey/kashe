import type {WeakStorage} from "../types.ts";

/**
 * Interface for cache model implementations that control cache scoping behavior.
 *
 * Cache models define how kashe creates isolated cache contexts and retrieves
 * caches for specific functions. Different models can be used for different environments:
 * - Browser: Simple in-memory caching
 * - Server: AsyncLocalStorage for request isolation
 * - Testing: Isolated contexts per test
 *
 * @example
 * ```ts
 * const customCacheModel: CacheModel = {
 *   createCacheScope: (cache, fn) => {
 *     // Custom scope creation logic
 *     return fn();
 *   },
 *   getCacheFor: (fn, cacheCreator) => {
 *     // Custom cache retrieval logic
 *     return cacheCreator();
 *   }
 * };
 * ```
 */
export interface CacheModel {
  /**
   * Creates a new cache scope and executes the provided function within it.
   * All kashe calls within the function should use the provided cache.
   *
   * @param cache - The WeakStorage instance to use as the cache
   * @param fn - The function to execute within the cache scope
   * @returns The result of executing the function
   *
   * @example
   * ```ts
   * const result = cacheModel.createCacheScope(myCache, () => {
   *   // All kashe calls here use myCache
   *   return expensiveComputation();
   * });
   * ```
   */
  createCacheScope<T>(cache: WeakStorage, fn: () => T): T;

  /**
   * Retrieves or creates a cache for the given function.
   * This method is called by kashe to determine which cache to use for a specific function.
   *
   * @param fn - The function to get/create a cache for (used as cache key)
   * @param cacheCreator - Factory function to create a new cache if needed
   * @returns The cache for this function, or undefined to use default behavior
   *
   * @example
   * ```ts
   * const cache = cacheModel.getCacheFor(myFunction, () => createWeakStorage());
   * if (cache) {
   *   // Use the retrieved/created cache
   * } else {
   *   // Fall back to default caching behavior
   * }
   * ```
   */
  getCacheFor(fn: any, cacheCreator: () => WeakStorage): WeakStorage | undefined;
}