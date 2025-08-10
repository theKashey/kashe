/**
 * Represents a cached result stored in weak storage.
 * Contains the cached value and potentially other metadata.
 */
export interface WeakResult {
  value: any;
  // index: number;
}

/**
 * Configuration options for weak storage operations.
 * Controls caching behavior and memory usage limits.
 */
type WeakStorageOptions = {
  /**
   * Controls the maximum number of items to store in the Map for primitive values.
   * Does not affect weak references stored in WeakMap.
   * Helps prevent memory bloat when caching many primitive argument combinations.
   * 
   * @example
   * ```ts
   * storage.set([key1, key2], value, { limit: 100 }); // Max 100 primitive values per argument
   * ```
   */
  limit?: number;

  /**
   * If enabled, allows using kashe without any weak-mappable arguments.
   * **WARNING: This is unsafe and not recommended** as it can lead to memory leaks.
   * 
   * - Should only be used with `resolver` or other scoping mechanisms
   * - Behavior is similar to `React.cache` or `Reselect v5`
   * - Setting `limit` option is strongly advised when enabled
   * 
   * @default false
   * @example
   * ```ts
   * // Unsafe usage - not recommended
   * const unsafe = kashe(fn, { UNSAFE_allowNoWeakKeys: true, limit: 100 });
   * unsafe(1, 2); // No longer throws
   * ```
   */
  UNSAFE_allowNoWeakKeys?: boolean;
}

/**
 * Low-level weak storage interface that underlies all kashe caching operations.
 * Provides get/set operations for storing cached values using sequences of keys.
 * 
 * All kashe functions (`kashe`, `boxed`, `inboxed`, `fork`) are built on top of this storage.
 * 
 * @example
 * ```ts
 * const storage = createWeakStorage();
 * storage.set([key1, key2], { value: 'data' });
 * const entry = storage.get([key1, key2]);
 * ```
 */
export interface WeakStorage {
  /**
   * Retrieves a cached value from the storage using a sequence of keys.
   * Returns undefined if no cached value exists for the given key sequence.
   * 
   * @param args - Array of keys used to identify the cached value
   * @returns The cached result or undefined if not found
   */
  get(args: any[]): WeakResult | undefined;

  /**
   * Stores a value in the storage using a sequence of keys.
   * The storage uses WeakMap for objects/arrays and Map for primitives (with optional limits).
   * 
   * @param args - Array of keys used to identify the cached value
   * @param value - The value to cache
   * @param options - Storage options including limit and UNSAFE_allowNoWeakKeys
   * @returns The stored value
   */
  set(args: any[], value: any, options?: WeakStorageOptions): any;
}

/**
 * Generic interface for Map-like objects that can store key-value pairs.
 * Used internally by the weak storage implementation.
 * 
 * @template T - The type of values stored in the mappable object
 */
export interface Mappable<T = any> {
  /**
   * Retrieves a value by key.
   * 
   * @param key - The key to look up
   * @returns The stored value or undefined if not found
   */
  get(key: any): T | undefined;

  /**
   * Stores a key-value pair.
   * 
   * @param key - The key to store the value under
   * @param value - The value to store
   */
  set(key: any, value: T): void;
}