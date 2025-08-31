<div align="center">
  <h1>kashe 🔥</h1>
  <br/>
  <b>Controllable, safe, and powerful memoization for any environment</b>
  <br/>
  <a href="https://www.npmjs.com/package/kashe">
    <img src="https://img.shields.io/npm/v/kashe.svg?style=flat-square" />
  </a>
  <a href="https://travis-ci.org/theKashey/kashe">
    <img alt="Travis" src="https://img.shields.io/travis/theKashey/kashe/master.svg?style=flat-square">
  </a>
</div>

---

# kashe

A controllable, safe, and universal **data derivation** library for JavaScript and TypeScript. `kashe` is built on the principles of **weak memoization**, offering a robust solution for modern applications. It's a tool to **derive data from data**. It addresses common challenges in memoization, such as memory leaks, cross-request safety, and test predictability, while providing advanced features like cache slicing, TTL, and per-request isolation.

- **Memory safe**: Uses WeakMap to store data and prevent memory leaks.
- **Per-request isolation**: Cache _slicing_ with `resolver` option.
- **Advanced control**: TTL with `serializer`, LRU cache limits, and more.
- **Universal**: Works in browsers, Node.js, SSR, and test environments.
- **Modern**: Written in TypeScript, with full ESM and CJS support, and extensive generics.

## Quick Start

```bash
npm install kashe
```

```ts
import { kashe } from 'kashe';

const expensiveCalculation = kashe((state, value) => {
  return computeExpensiveValue(state, value);
});

// Cached on first call
const result1 = expensiveCalculation(myState, value1);
// Returns cached result
const result2 = expensiveCalculation(myState, value1);
// Returns a different result
const result3 = expensiveCalculation(myState, value2);
```

The simple usage of `kashe` is almost completely equal to `React.cache`. Feel free to refer to [their documentation](https://react.dev/reference/react/cache) for other use cases.

## Design Philosophy & Non-Goals

- Kashe is **not** a drop-in replacement for every memoization library. It's designed with specific principles that prioritize **memory safety and leak prevention** over convenience features.
- Kashe **is** a drop-in replacement for every memoization library. Just follow the rules and configure it properly.
- Kashe is not yet another "memoization" library. Its a tool to **derive data from data**.

```tsx
// standard memoization - remembers arguments and results
const processor = memoizationFunction((array) => array.map(x => x * 2));

// kashe - remembers that data was derived from data
const processor = kashe((array) => array.map(x => x * 2));
```
They look the same, but there is big difference.

### Core Principles ✅

- **Memory leaks are more important than developer convenience**: Kashe requires at least one object argument for weak references. No extra steps are needed if any _scoping_ is active.
- **Data lifecycle is coupled with argument lifecycle**: Cache entries are automatically cleaned up when arguments are garbage collected. No separate eviction policies are needed.
- **Reference equality only**: All objects are stored in a WeakMap and cannot be fetched back for comparison. Custom equality comparators would require strong references, risking leaks.
- **Comprehensive memoization over raw performance**: Kashe trades micro-optimizations for the ability to memoize more cases safely, saving overall application time.

### Intentional Non-Goals ❌

- **Native primitive-only argument support**: Disabled by default to prevent accidental memory leaks, but can be enabled through scoping or `UNSAFE_allowNoWeakKeys`.
- **Custom/deep equality comparators**: Would break the weak reference model and risk memory leaks.
- **Separate eviction policies**: Cache lifecycle follows the argument lifecycle by design.
- **Performance optimization for simple cases**: The focus is on comprehensive, safe memoization.

### What This Means for You

- **Perfect for**: SSR, concurrent environments, long-running applications, multi-tenant systems.
- **Not ideal for**: Simple primitive-only functions, scenarios requiring deep equality, or performance-critical micro-optimizations.

## Core Concepts

### Weak Memoization
Unlike traditional memoization that stores results in a global cache, `kashe` stores results **inside the arguments themselves** using WeakMap. This means:
- No memory leaks - when arguments are garbage collected, so is the cache
- No global state pollution
- Perfect for server-side rendering and concurrent environments

### Cache Slicing
One of the super powers of `kashe` is the ability to create **isolated cache slices** to control how caches are scoped, enabling per-function, per-request or per-context caching.

There are several ways to achieve this:
- `inboxed` - creates a new `cache scope` controlled by the first argument.
- `fork` - creates a new independent `cache scope` for an existing `kashe` function.
- using `resolver` option to get a full control over cache isolation.

The `resolver` option allows you to create isolated cache "slices" - perfect for per-request caching:

```ts
const perRequestCache = kashe(
  (data) => processData(data),
  { resolver: () => currentRequest } // Each request gets its own cache
);
```

---

## Why kashe?

Memoization is a powerful technique for optimizing performance, but it often comes with trade-offs:
- **Memory leaks**: Traditional memoization libraries may retain references indefinitely.
- **Cross-request safety**: In server-side environments, shared caches can lead to data leakage between requests.
- **Test unpredictability**: Memoization can make tests less reliable by retaining state across runs.

`kashe` solves these problems by leveraging weak references and scoped caching, ensuring:
- **Memory safety**: Cached values are automatically garbage-collected when no longer needed.
- **Request isolation**: Per-request or per-context caching prevents data leakage.
- **Predictable behavior**: Tests remain consistent and reliable.

# API Reference

### `kashe(func, options?)`

The main memoization function with advanced options.

```ts
import { kashe } from 'kashe';

const memoized = kashe(
  (state, extra) => computeValue(state, extra),
  {
    // only needed for cases of separation where `cache scope` is not applicable
    resolver: () => requestContext, // Cache slicing
    // a safety measure to control memory usage
    limit: 100,                     // Limit primitive args cache
    // a low level function to enable extra cases 
    serializer: {                   // Custom serialization
      writeTo: (value) => ({ value, timestamp: Date.now() }),
      readFrom: (entry) => isValid(entry) ? entry.value : undefined
    }
  }
);
```

#### Options

- **`resolver?: () => object | symbol`**  
  Creates isolated cache slices. Each unique return value gets its own cache.
  Resolver must return an object or array. In case of array at least one item must be a non primitive.
  ```ts
  // Per-request caching
  const perRequest = kashe(fn, { resolver: () => currentRequest });
  
  // Per-user caching  
  const perUser = kashe(fn, { resolver: () => currentUser });
  
  // Per-request and per-user caching  
  const perAll = kashe(fn, { resolver: () => [currentRequest,currentUser] });  
  ```

- **`limit?: number`**  
  Limits how many primitive argument combinations are cached. Helps control memory usage. Before the limit is reached, no extra logic is applied. Once the limit is reached, the Least Recently Used record is dropped from the cache.
  ```ts
  const limited = kashe(fn, { limit: 50 }); // Max 50 primitive values "per argument"
  ```

- **`serializer?: { writeTo?, readFrom }`**  
  Custom serialization for cached values. Perfect for TTL implementation.
  ```ts
  const withTTL = kashe(fn, {
    serializer: {
      writeTo: (value) => ({ value, expires: Date.now() + 60000 }),
      readFrom: (entry) => Date.now() < entry.expires ? entry.value : undefined
    }
  });
  ```
- **`scope?: any`** 
    Allows you to specify a custom cache scope. Useful for advanced scenarios where you need to control cache isolation manually. 
    - `scope` applies only when "isolation" is in place - `inboxed`, `fork` or `withKasheIsolation`.
    - `scope` has no meaning without any of the above. If explicit isolation is not used, default to `resolver` to separate caches.
    ```ts
    // normal kashe call that we would scope per request
    const defaultScoped = kashe(fetchUserData);
    // version scoped to a different key, like a server or a session
    const scoped = kashe(fetchServerSettings, { scope: 'SERVER', serializer: TTLSerializer });
    ```

- **`UNSAFE_allowNoWeakKeys?: boolean`**  
  Allows using `kashe` without any weak-mappable arguments. This is not recommended, as it can lead to memory leaks and unpredictable behavior.
  - `true` behavior is non-default and strongly not recommended unless you have `resolver` or are _scoped_ in any other way.
  - `true` behavior is __similar to `React.cache` or `Reselect v5`__.
  - Configuring this option is NOT required if the cache is scoped via `resolver`, `withKasheIsolation` or `inboxed`.
  - An explicit `false` will be always respected.
  - Setting the `limit` option is advised.
  ```ts
  // Unsafe usage, not recommended
  const unsafe = kashe(fn, { UNSAFE_allowNoWeakKeys: true, limit: 100 });
  unsafe(1,2); // no longer throws
  ```

### `weakKashe(weakArgs)(func, options?)`

A relaxed version that uses string comparison for specified argument positions.

```ts
import { weakKashe } from 'kashe';

// Mark the second argument (transform) as weakly compared
const mapper = weakKashe([1])((data, transform) => data.map(transform));

mapper(data, x => x * 2); // running transformation
mapper(data, x => x * 2); // reusing cached result
```

### `boxed(func)`

Adds a cache key as the first argument to any function.

```ts
import { boxed } from 'kashe';

const add = (a, b) => a + b;
const boxedAdd = boxed(add);

const cacheKey = {};
boxedAdd(cacheKey, 1, 2); // 3 (cached)
boxedAdd(cacheKey, 1, 2); // 3 (from cache)
```

### `inboxed(func)`

Creates nested `cache scope` - all `kashe` calls inside use the provided key.

```ts
import { inboxed } from 'kashe';

const scopedProcessor = inboxed((state) => {
  // All kashe calls inside are scoped to the first argument
  return processWithNestedKashe(state);
});

scopedProcessor(sessionKey, state); // Isolated cache per sessionKey
```

### `fork(func)`

Creates an independent cache for an existing kashe-d function.

```ts
import { fork } from 'kashe';

const original = kashe(expensiveFunction);
const independent = fork(original); // Separate cache, same function

original(data) !== independent(data); // Different caches
```

### `withKasheIsolation(func, options?)`

Starts a new cache scope for all `kashe` calls made within the provided function. Perfect for per-request isolation or creating completely isolated cache contexts.

```ts
import { withKasheIsolation } from 'kashe';

// Per-request isolation in a server
app.get('/api/data', (req, res) => {
  withKasheIsolation(() => {
    // All kashe calls inside get their own isolated cache
    const result = processData(req.params); // Cached per request
    res.json(result);
  });
});

// Test isolation
test('should have isolated cache', () => {
  withKasheIsolation(() => {
    // Cache is completely isolated from other tests
    const result = expensiveFunction(testData);
    expect(result).toBe(expectedValue);
  });
});
```

#### Options
- **`scope?: any`** - Custom cache scope for advanced scenarios.
- **`pointer?: any`** - Custom pointer object for cache identification (default: new object `{}`).

> 💡`pointer` acts the same way as `resolver` for kashe, or the first argument for `boxed` and `inboxed` - the same value will point to the same cache. While this is a tool of separation, it can be used as a tool of union.

⚠️ All "cache scope" powered functions work "properly" only if controlled directly by the user (like a custom `resolver`) or if wrapped locations are `sync`.
Correct "thread-safe" behavior is only possible with `asyncLocalStorageModel`, see below.

> Cheatsheet:
> - `kashe` and `weakKashe` are the primary memoization functions. `weakKashe` offers relaxed comparison for specified arguments.
> - `boxed` and `inboxed` prepend a cache-key argument. `inboxed` affects nested `kashe` calls, while `boxed` does not.
> - `fork` and `withKasheIsolation` create isolated cache scopes. `fork` returns a new function, while `withKasheIsolation` executes a given function within the scope.


### `createWeakStorage()`
It's worth mentioning that all commands above are just a thin layer around `createWeakStorage`. You can use it to do your own magic tricks.

```ts
import { createWeakStorage } from 'kashe';

const storage = createWeakStorage();
// Store a value in the storage
storage.set([key1, key2], { value: 'data' });
// Retrieve the value
const entry = storage.get([key1, key2]);
```
`createWeakStorage` creates a storage with just two methods - `get` and `set`.
- `get(key: any[])` - retrieves a value from the storage using a sequence of keys.
- `set(key: any[], value: any, options)` - stores a value in the storage using a sequence of keys.
  - `options` can include
    - `limit` to limit the amount of cached "simple" values (similar to `kashe`'s `limit` option)
    - `UNSAFE_allowNoWeakKeys` to control the enforcement of at least one arg to be weak-mappable (default is `false`)

### `resetKashe()`
Resets all caches created by `kashe`. Useful for testing to ensure a clean state between tests.

```ts
import {resetKashe} from 'kashe';

afterEach(() => {
    // clears up all caches
    resetKashe();
});
```

---

## Advanced Usage Examples

### React.cache-style Per-Request Caching

```ts
// Server-side per-request isolation
const processUserData = kashe(
  (userData) => expensiveProcessing(userData),
  { resolver: () => getCurrentRequest() }
);

// Each request gets isolated cache
app.get('/api/user', (req, res) => {
  setCurrentRequest(req);
  const result = processUserData(req.user); // Cached per request
  res.json(result);
});
```

### Replacing React.cache
```diff
- const expensiveFunction = React.cache(performOperation);

+ // Option 1: Use react cache to give us a cache key
+ const reactResolver = React.cache(() => ({}));
+ // use it to "slice" data per react render
+ const expensiveFunction = kashe(performOperation, {resolver: reactResolver});

+ // Option 2: Use withKasheIsolation for per-request isolation
+ const expensiveFunction = kashe(performOperation, {UNSAFE_allowNoWeakKeys: true});
+ // Then wrap your request handler:
+ app.get('/api/data', (req, res) => {
+   withKasheIsolation(() => {
+     const result = expensiveFunction(req.params);
+     res.json(result);
+   });
+ });
```
While it might look a little bit more verbose, it gives you full control over cache isolation and memory usage
and is not limited to ServerComponents (or React at all).

### TTL (Time-To-Live) Caching

```ts
const cacheWithTTL = kashe(
  (data) => fetchExpensiveData(data),
  {
    serializer: {
      writeTo: (value) => ({ 
        value, 
        timestamp: Date.now() 
      }),
      readFrom: (entry) => {
        const isExpired = Date.now() - entry.timestamp > 5000; // 5s TTL
        return isExpired ? undefined : entry.value;
      }
    }
  }
);
```

### Promise/Async memoization

A function returning a Promise can be memoized like any other. `kashe` will cache the promise itself, so subsequent calls with the same arguments will receive the same promise instance.

```ts
// A function returning a Promise can be memoized like any other
const fetchUser = kashe(async (id: string) => {
  const res = await fetch(`/api/users/${id}`);
  return res.json();
});

// After the first call caches the promise, subsequent calls reuse it
await fetchUser('42');
const again = fetchUser('42'); // returns the same Promise instance if cached
```

### Memory-Limited Caching

```ts
// Limit primitive arguments to prevent memory bloat
const limitedCache = kashe(
  (data: State, index:number, type:string) => processData(data, index, type),
  { limit: 100 } // Only cache 100 indexes storing maximum 100 different types (each)
);
```

### Multi-tenant Cache Isolation

```ts
let currentTenant: string;

const tenantIsolatedCache = kashe(
  (query) => executeQuery(query),
  { resolver: () => currentTenant }
);

// Different tenants get completely isolated caches
setTenant('tenant-a');
tenantIsolatedCache(query); // Cached for tenant-a

setTenant('tenant-b'); 
tenantIsolatedCache(query); // Separate cache for tenant-b
```

---

## Troubleshooting
#### solving `Error: No weak-mappable object found to read a cache from.`
If all arguments provided to a function are non "weak-mappable" objects (like primitives: numbers, strings, booleans) - kashe will throw.

**This is intentional by design** - kashe stores cache inside objects using WeakMap, and without them, it cannot work safely.

**Deliberate design choice**: Memory leaks are more important than developer convenience. This error prevents potential memory disasters.

There are three ways to solve it:
- **Recommended**: Don't use `kashe` for functions with only primitive types; use a different library designed for that use case.
- **Advanced**: Specify `resolver` to create a `cache scope` that provides the necessary object reference.
- **Unsafe**: Use `UNSAFE_allowNoWeakKeys: true` with a `limit` (not recommended as it risks memory leaks).

```ts
// ❌ Will throw - all primitives
const bad = kashe((x: number, y: string) => x + y.length);

// ✅ Works - has object argument  
const good = kashe((state: State, x: number) => state.compute(x));

// ✅ Works - uses resolver for scoping
const scoped = kashe((x: number, y: string) => x + y.length, {
  resolver: () => currentRequest // Provides object reference
});

// ✅ Works - explicitly unsafe, but allowed
const unsafeButWorking = kashe((x: number, y: string) => x + y.length, {
    UNSAFE_allowNoWeakKeys: true,
    limit: 1000, // A limit is strongly recommended to mitigate leak risks
});
```

# See also
## Memoize-one
`kashe` is a capable replacement for `memoize-one`. However, if a function is called only with primitive arguments, you must enable `UNSAFE_allowNoWeakKeys` or use a scoping mechanism (`resolver`, `inboxed`, etc.) to avoid an error.

## React.useMemo
You may use React.useRef/useState/Context to create and propagate a per-instance, or per-tree "variable" to scope `kashe`.
Or you may use `kashe` without anything extra.

```js
const KasheContext = React.createContext();
// create a "value provider". useRef would give you an object you may use
const CacheKeyProvider = ({children}) => (
  <KasheContext.Provider value={useRef({})}>{children}</KasheContext.Provider>
);

// "box" function to prepend with an extra argument for `kasheKey`
const memoizedFunction = boxed(kashe(aFunction));

const OtherComponent = () => {
  const kasheKey = useContext(KasheContext);
  const localKasheKey = useRef();
  // use per-render key to store data
  const memoizedData1 = memoizedFunction(kasheKey, firstArgument, secondArgument);
  // use per-instance key to store data
  const memoizedData2 = memoizedFunction(localKasheKey, firstArgument, secondArgument);
}
```
So - almost the same as `React.useMemo`, almost equal to `React.cache`, but you might use it in Class Components, `mapStateToProps`, server, client, anywhere.

### more like useMemo
💡 `weakKashe` was created to allow you to inline function implementation, but this operation might be "unsafe"
```tsx
// we will compare very first argument by its string representation
const useKashe = weakKashe([0])((fn, deps) => fn(...deps));

const MyComponent = ({value}) => {
  // use `useMemo` creates a separate cache in every component
  const reactMemo = useMemo(() => computeExpensiveValue(value), [value]);

  // use `useKashe` shares a cache across all components
  // it's "scoped" by `value` and at least one dependency
  const memoizedValue = useKashe(() => computeExpensiveValue(value), [value]);

  return <div>{memoizedValue}</div>;
};
```

## mapStateToProps
`kashe` can fully replace `reselect`. It was [natively supported](https://github.com/theKashey/kashe/blob/v2.0.0/src/reselect.ts#L5) up to v2.
While [reselect v5 provides weak memoization](https://reselect.js.org/api/weakMapMemoize) out of the box, there is a place for `kashe`
- using reselect
```ts
const selectItemsByCategory = createSelector(
  [
    (state: RootState) => state.items,
    (state: RootState, category: string) => category
  ],
  (items, category) => items.filter(item => item.category === category),
  {
    memoize: weakMapMemoize,
    argsMemoize: weakMapMemoize
  }
)

selectItemsByCategory(state, 'Electronics') // Selector runs
selectItemsByCategory(state, 'Electronics') // Cached
selectItemsByCategory(state, 'Stationery') // Selector runs
selectItemsByCategory(state, 'Electronics') // Still cached!
```
- using kashe
```ts
const selectItemsByCategory = createSelector(
  [
    (state: RootState) => state.items,
    (state: RootState, category: string) => category
  ],
  // just use kashe at the right place
  kashe((items, category) => items.filter(item => item.category === category)),
)

selectItemsByCategory(state, 'Electronics') // Selector runs
selectItemsByCategory(state, 'Electronics') // Cached
selectItemsByCategory(state, 'Stationery') // Selector runs
selectItemsByCategory(state, 'Electronics') // Still cached!
```

## Cache Model Configuration
By default, `kashe` uses a synchronous cache scoping model.
Scoping occurs only when you use `fork` or `inboxed` helpers, or wrap location with `withKasheIsolation` and not in any other cases.
However any invocation of `kashe` will refer to the current cache model and obey it.

For advanced scenarios like server-side rendering with request isolation, you can configure a different cache model.

### `configureCacheModel(model)`

Changes the global cache model used by all `kashe` functions.

```ts
import { configureCacheModel } from 'kashe';
import { asyncLocalStorageModel } from 'kashe/async-local-storage-cache';

// Switch to async cache model
configureCacheModel(asyncLocalStorageModel);
```

### Built-in Cache Models

#### Async Local Storage Cache (`kashe/async-local-storage-cache`)

Uses Node.js `AsyncLocalStorage` for automatic per-request cache isolation. Perfect for server-side applications where you need to prevent cache leakage between different requests.

```ts
import { configureCacheModel } from 'kashe';
import { asyncLocalStorageModel } from 'kashe/async-local-storage-cache';

// Configure async cache model
configureCacheModel(asyncLocalStorageModel);

const processData = kashe((data) => expensiveOperation(data));

// In your server
app.use((req, res, next) => {
  // Each request automatically gets isolated cache
  withKasheIsolation(() => {
      processData(someData); // Cached per request
  });
  next();
});
```

**Benefits**:
- Automatic request isolation without manual `resolver` configuration
- No memory leaks between requests
- Works seamlessly with async operations

#### Sync Cache (default)

The default synchronous cache model using WeakMap. Suitable for client-side applications and simple server scenarios.
Warning: Sync cache is not expected to be able to properly handle async operations.

### Multiple Cache Models
Sometimes you even might want to use custom cache models or reuse implementation of existing ones to have multiple caching realities at the same time.

💡by default there is one active cache model, and if you called `withKasheIsolation` - two different requests will be NEVER able to share cache.
However you can provide `cacheModel` to the `kashe` function to let them coexist.

### Custom Cache Models
You can implement custom cache models by providing an object with the required interface.
```ts
import {configureCacheModel, createWeakStorage} from 'kashe';

const getCurrentDispatcher = () => SECRET_INTERNALS_DO_NOT_USE_OR_GET_FIRED.currentDispatcher;
const customDispatcherModel = () => {
    const localStorage = createWeakStorage();
    return {
        createCacheScope: (cache, fn) => {
            // Run function with cache scope
            throw new Error('scoping is not implemented');
        },
        getCacheFor: (fn, cacheCreator) => {
            // create different caches for different dispatchers
            // technically equal to setting `resolver` to each `kashe` call
            const args = [fn, getCurrentDispatcher()];
            const cache = localStorage.get(args);

            if (cache) {
                return cache.value;
            }

            return localStorage.set(
                args,
                cacheCreator()
            );
        }
    }
};

configureCacheModel(customDispatcherModel);
```

# Speed

**Performance Philosophy**: Raw speed is not the goal - comprehensive memoization and memory safety are. Kashe trades micro-optimizations for the ability to memoize more cases safely, saving overall application time.

```html
// a simple one argument function, 100% results cached
memoize-one one argument  x 58,277,071 ops/sec ±1.60% (87 runs sampled)
kashe       one argument  x 19,724,367 ops/sec ±0.76% (91 runs sampled)

// a simple two arguments function, 100% results cached
memoize-one two arguments x 42,526,871 ops/sec ±0.77% (90 runs sampled)
kashe       two arguments x 16,929,449 ops/sec ±0.84% (89 runs sampled)

// a case for multiple cache entries - memoize-one is failing, while kashe still have 100% results cached
memoize-one    two states x   308,917 ops/sec ±0.56% (92 runs sampled)
kashe          two states x 8,992,170 ops/sec ±0.96% (83 runs sampled)
```

**The real story**: While kashe is slower in simple cases, it excels where other libraries fail. In the "two states" benchmark, kashe maintains 100% cache hit rate (8.9M ops/sec) while memoize-one degrades to ~300K ops/sec due to cache invalidation. This demonstrates kashe's strength: **consistent performance across complex scenarios where cache management matters most**.

# Something to read
- https://dev.to/thekashey/weak-memoization-in-javascript-4po6
- https://dev.to/thekashey/memoization-forget-me-bomb-34kh

# License
MIT
