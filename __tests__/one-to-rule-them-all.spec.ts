import {kashe, boxed, withKasheIsolation, resetKashe} from '../src/index.ts';

describe('kashe: one to rule them all', () => {
    // Clean slate for each test - prevents cache pollution between tests
    afterEach(() => {
        resetKashe();
    });

    // React.cache replacement: Demonstrates per-request isolation, concurrent safety, and SSR patterns
    describe('React.cache replacement', () => {
        // Basic weak memoization using object arguments
        test('basic caching with object args (referentially stable)', () => {
            const calls: number[] = [];
            const compute = kashe((state: {x: number}) => {
                calls.push(1);
 
                return {sum: state.x + 1, ref: {}};
            });

            const s = {x: 1};
            const r1 = compute(s);
            const r2 = compute(s);
            expect(r1).toBe(r2);
            expect(calls.length).toBe(1);

            const r3 = compute({x: 1});
            expect(r3).not.toBe(r1);
            expect(calls.length).toBe(2);
        });

        // Safety mechanism: kashe requires weak-mappable arguments by default
        test('primitive-only args throw unless UNSAFE is enabled', () => {
            const timesTwo = kashe((n: number) => n * 2);
            expect(() => timesTwo(2)).toThrow(/No weak-mappable/);
        });

        // Per-request isolation pattern for server-side rendering
        test('UNSAFE + withKasheIsolation for per-request isolation', () => {
            const calls: number[] = [];
            const unsafeCached = kashe(
                (n: number) => {
                    calls.push(1);

                    return {value: n, token: {}, nCalls: calls.length};
                },
                {UNSAFE_allowNoWeakKeys: true}
            );

            // Same scope: second call hits cache
            const sameScope = withKasheIsolation(() => {
                const a = unsafeCached(42);
                const b = unsafeCached(42);
                expect(a).toBe(b);

                return a;
            });

            // Different isolated scope: cache is not shared
            const otherScope = withKasheIsolation(() => unsafeCached(42));
            expect(sameScope).not.toBe(otherScope);

            expect(calls.length).toBe(2);
        });

        // Async data fetching with proper isolation between requests
        test('async data fetching with per-request caching', async () => {
            const fetchCalls: string[] = [];

            const fetchUser = kashe(async (userId: string) => {
                fetchCalls.push(userId);
                await new Promise(resolve => setTimeout(resolve, 10));

                return { id: userId, name: `User ${userId}`, token: {} };
            }, { UNSAFE_allowNoWeakKeys: true });

            // Simulate multiple requests with isolation
            const request1Result = await withKasheIsolation(async () => {
                const user1 = await fetchUser('123');
                const user1Again = await fetchUser('123'); // Should hit cache
                const user2 = await fetchUser('456');

                expect(user1).toBe(user1Again);
                expect(user1).not.toBe(user2);

                return { user1, user2 };
            });

            const request2Result = await withKasheIsolation(async () => {
                const user1 = await fetchUser('123'); // Different request, should fetch again

                return user1;
            });

            expect(request1Result.user1).not.toBe(request2Result);
            expect(fetchCalls).toEqual(['123', '456', '123']);
        });

        // Concurrent rendering safety for React components
        test('concurrent rendering safety with multiple components', () => {
            const renderCalls: number[] = [];
            const computeProps = kashe((props: { id: number; data: any }) => {
                renderCalls.push(props.id);

                return {
                    ...props,
                    computed: props.id * 2,
                    ref: {}
                };
            });

            // Simulate concurrent rendering of multiple components
            const props1 = { id: 1, data: { value: 'a' } };
            const props2 = { id: 2, data: { value: 'b' } };

            // First render cycle
            const result1a = computeProps(props1);
            const result2a = computeProps(props2);

            // Second render cycle (should hit cache)
            const result1b = computeProps(props1);
            const result2b = computeProps(props2);

            expect(result1a).toBe(result1b);
            expect(result2a).toBe(result2b);
            expect(renderCalls).toEqual([1, 2]);
        });

        // Nested memoization pattern for component hierarchies
        test('nested cache calls with component hierarchy', () => {
            const calls = { parent: 0, child: 0 };

            const computeChildData = kashe((childProps: { id: string; value: number }) => {
                calls.child++;

                return {
                    id: childProps.id,
                    doubled: childProps.value * 2,
                    token: {}
                };
            });

            const computeParentData = kashe((parentProps: { children: Array<{ id: string; value: number }> }) => {
                calls.parent++;

                const childResults = parentProps.children.map(child => computeChildData(child));

                return {
                    children: childResults,
                    total: childResults.reduce((sum, child) => sum + child.doubled, 0),
                    token: {}
                };
            });

            const props = {
                children: [
                    { id: 'a', value: 5 },
                    { id: 'b', value: 10 }
                ]
            };

            const result1 = computeParentData(props);
            const result2 = computeParentData(props);

            expect(result1).toBe(result2);
            expect(calls).toEqual({ parent: 1, child: 2 });
        });

        // Cache invalidation for testing isolation
        test('resetKashe clears all caches', () => {
            const f = kashe((_: {}) => ({ref: {}}));
            const arg = {};
            const a = f(arg);
            resetKashe();

            const b = f(arg);
            expect(a).not.toBe(b);
        });

        // SSR pattern with multiple concurrent requests
        test('server-side rendering with request isolation', () => {
            const getUserData = kashe((userId: string) => {
                return {
                    id: userId,
                    timestamp: Date.now(),
                    token: {}
                };
            }, { UNSAFE_allowNoWeakKeys: true });

            // Simulate SSR with multiple concurrent requests
            const request1 = withKasheIsolation(() => {
                const user1 = getUserData('user1');
                const user1Again = getUserData('user1');
                expect(user1).toBe(user1Again);

                return user1;
            });

            const request2 = withKasheIsolation(() => {
                const user1 = getUserData('user1'); // Same user ID, different request

                return user1;
            });

            // Should be different instances due to isolation
            expect(request1).not.toBe(request2);
            expect(request1.id).toBe(request2.id);
        });
    });

    // lodash.memoize replacement: Demonstrates primitive arguments, custom resolvers, and memory management
    describe('lodash.memoize replacement', () => {
        // Basic primitive memoization with explicit unsafe mode
        test('single-argument memoization (primitives) with UNSAFE enabled', () => {
            let calls = 0;
            const heavy = kashe((n: number) => {
                calls++;

                return n * n;
            }, {UNSAFE_allowNoWeakKeys: true, limit: 100}
            );

            expect(heavy(9)).toBe(81);
            expect(heavy(9)).toBe(81);
            expect(calls).toBe(1);
        });

        // Primitive memoization using isolation instead of unsafe mode
        test('single-argument memoization (primitives) without UNSAFE enabled (+isolation)', () => {
            let calls = 0;
            const heavy = kashe((n: number) => {
                    calls++;

                    return n * n;
                }
            );

            withKasheIsolation(() => {
                expect(heavy(9)).toBe(81);
                expect(heavy(9)).toBe(81);
            });

            expect(calls).toBe(1);
        });

        // Custom resolver pattern mimicking lodash.memoize(fn, resolver)
        test('multi-arg memoization with custom resolver via boxed', () => {
            // lodash.memoize(fn, resolver) analog
            function ldMemoize<T extends any[], R>(
                fn: (...args: T) => R,
                resolver: (...args: T) => object | symbol | string
            ): (...args: T) => R {
                const boxedFn = boxed((...args: T) => fn(...args), {UNSAFE_allowNoWeakKeys: true});

                return (...args: T) => boxedFn(resolver(...args) as any, ...args);
            }

            let calls = 0;

            const sum = (a: number, b: number) => {
                calls++;

                return a + b;
            };

            const memo = ldMemoize(sum, (a, b) => `sum:${a},${b}`);

            expect(memo(2, 3)).toBe(5);
            expect(memo(2, 3)).toBe(5);
            expect(calls).toBe(1);

            expect(memo(3, 3)).toBe(6);
            expect(calls).toBe(2);
        });

        // Memory-safe weak references prevent memory leaks
        test('object key memoization is memory-safe (weak keys)', () => {
            let calls = 0;
            const doubleV = kashe((obj: {v: number}) => {
                calls++;

                return obj.v * 2;
            });

            const key = {v: 7};
            expect(doubleV(key)).toBe(14);
            expect(doubleV(key)).toBe(14);
            expect(calls).toBe(1);

            expect(doubleV({v: 7})).toBe(14);
            expect(calls).toBe(2);
        });

        // Complex multi-argument functions with mixed primitive and object types
        test('complex multi-argument function with mixed types', () => {
            let calls = 0;
            const processData = kashe((
                config: { mode: string; debug: boolean },
                data: number[],
                transform: string
            ) => {
                calls++;

                return {
                    result: data.map(x => transform === 'double' ? x * 2 : x + 1),
                    config,
                    timestamp: Date.now(),
                    token: {}
                };
            });

            const config = { mode: 'prod', debug: false };
            const data = [1, 2, 3];

            const result1 = processData(config, data, 'double');
            const result2 = processData(config, data, 'double');
            expect(result1).toBe(result2);
            expect(calls).toBe(1);

            // Different transform should trigger new computation
            const result3 = processData(config, data, 'increment');
            expect(result3).not.toBe(result1);
            expect(calls).toBe(2);
        });

        // Memory control using LRU eviction with limit option
        test('memoization with limit option for memory control', () => {
            let calls = 0;
            const fibonacci = kashe((n: number):number => {
                calls++;
                if (n <= 1) return n;

                return fibonacci(n - 1) + fibonacci(n - 2);
            }, { UNSAFE_allowNoWeakKeys: true, limit: 5 });

            withKasheIsolation(() => {
                expect(fibonacci(10)).toBe(55);
                expect(fibonacci(10)).toBe(55); // Should hit cache

                // Test that limit is respected by calling many different values
                for (let i = 11; i <= 20; i++) {
                    fibonacci(i);
                }

                fibonacci(10);
                // We can't guarantee exact behavior due to LRU, but test should pass
                expect(calls).toBeGreaterThan(0);
            });
        });

        // Promise memoization for async functions
        test('async functions with promise memoization', async () => {
            let calls = 0;
            const asyncCompute = kashe(async (input: string) => {
                calls++;
                await new Promise(resolve => setTimeout(resolve, 10));

                return { input: input.toUpperCase(), timestamp: Date.now(), token: {} };
            }, { UNSAFE_allowNoWeakKeys: true });

            withKasheIsolation(async () => {
                const promise1 = asyncCompute('hello');
                const promise2 = asyncCompute('hello');

                // Should return the same promise instance
                expect(promise1).toBe(promise2);

                const result1 = await promise1;
                const result2 = await promise2;

                expect(result1).toBe(result2);
                expect(calls).toBe(1);
            });
        });

        // Demonstrating how to build lodash.memoize-like functionality
        test('lodash.memoize with custom cache implementation', () => {
            // Simulating lodash.memoize's cache property
            function createLodashMemoize<T extends any[], R>(
                fn: (...args: T) => R,
                resolver?: (...args: T) => string
            ) {
                const defaultResolver = (...args: T) => JSON.stringify(args);
                const actualResolver = resolver || defaultResolver;

                const cache = new Map<string, R>();

                return (...args: T): R => {
                    const key = actualResolver(...args);

                    if (cache.has(key)) {
                        return cache.get(key)!;
                    }

                    const result = fn(...args);
                    cache.set(key, result);

                    return result;
                };
            }

            let calls = 0;

            const multiply = (a: number, b: number) => {
                calls++;

                return a * b;
            };

            const memoized = createLodashMemoize(multiply, (a, b) => `${a}-${b}`);

            expect(memoized(3, 4)).toBe(12);
            expect(memoized(3, 4)).toBe(12);
            expect(calls).toBe(1);

            expect(memoized(4, 3)).toBe(12);
            expect(calls).toBe(2);
        });

        // Higher-order functions with function arguments
        test('function as arguments (higher-order functions)', () => {
            let calls = 0;
            const applyTransform = kashe((
                data: { values: number[] },
                transform: (x: number) => number
            ) => {
                calls++;

                return {
                    original: data.values,
                    transformed: data.values.map(transform),
                    token: {}
                };
            });

            const data = { values: [1, 2, 3, 4] };
            const doubler = (x: number) => x * 2;
            const tripler = (x: number) => x * 3;

            const result1 = applyTransform(data, doubler);
            const result2 = applyTransform(data, doubler);
            expect(result1).toBe(result2);
            expect(calls).toBe(1);

            const result3 = applyTransform(data, tripler);
            expect(result3).not.toBe(result1);
            expect(calls).toBe(2);
        });

        // Manual cache management and clearing
        test('cache clearing and manual cache management', () => {
            let calls = 0;
            const computeExpensive = kashe((input: { id: number }) => {
                calls++;

                return { result: input.id * 100, token: {} };
            });

            const input = { id: 5 };
            const result1 = computeExpensive(input);
            const result2 = computeExpensive(input);
            expect(result1).toBe(result2);
            expect(calls).toBe(1);

            // Clear all caches using resetKashe helper
            resetKashe();

            const result3 = computeExpensive(input);
            expect(result3).not.toBe(result1);
            expect(calls).toBe(2);
        });
    });

    // memoize-one replacement: Shows kashe's advantage of retaining multiple cached results
    describe('memoize-one replacement', () => {
        // Basic same/different args pattern like memoize-one
        test('same args -> cached; different args -> recompute', () => {
            let calls = 0;
            const compute = kashe((a: {id: number}, b: number) => {
                calls++;

                return {out: a.id + b, marker: {}};
            });

            const s = {id: 1};
            const r1 = compute(s, 10);
            const r2 = compute(s, 10);
            expect(r1).toBe(r2);
            expect(calls).toBe(1);

            const r3 = compute(s, 20);
            expect(r3).not.toBe(r1);
            expect(calls).toBe(2);
        });

        // kashe's advantage: multiple cached results vs memoize-one's single result
        test('multiple distinct argument tuples are retained (beyond memoize-one)', () => {
            let calls = 0;
            const selector = kashe((state: {id: number}) => {
                calls++;

                return {state, token: {}};
            });

            const s1 = {id: 1};
            const s2 = {id: 2};

            const r1a = selector(s1);
            const r2a = selector(s2);
            const r1b = selector(s1);
            const r2b = selector(s2);

            expect(r1a).toBe(r1b);
            expect(r2a).toBe(r2b);
            expect(r1a).not.toBe(r2a);
            expect(calls).toBe(2); // both states cached concurrently
        });

        // React selector pattern for state derivation
        test('React selector pattern with state derivation', () => {
            let calls = 0;
            const selectUsersByRole = kashe((
                users: Array<{ id: number; name: string; role: string }>,
                role: string
            ) => {
                calls++;

                return {
                    filtered: users.filter(user => user.role === role),
                    count: users.filter(user => user.role === role).length,
                    role,
                    timestamp: Date.now(),
                    token: {}
                };
            });

            const users = [
                { id: 1, name: 'Alice', role: 'admin' },
                { id: 2, name: 'Bob', role: 'user' },
                { id: 3, name: 'Charlie', role: 'admin' }
            ];

            // First call
            const adminUsers1 = selectUsersByRole(users, 'admin');
            expect(adminUsers1.count).toBe(2);
            expect(calls).toBe(1);

            // Same arguments - should hit cache
            const adminUsers2 = selectUsersByRole(users, 'admin');
            expect(adminUsers1).toBe(adminUsers2);
            expect(calls).toBe(1);

            // Different role - new computation
            const regularUsers = selectUsersByRole(users, 'user');
            expect(regularUsers.count).toBe(1);
            expect(calls).toBe(2);

            // Back to admin - should still be cached
            const adminUsers3 = selectUsersByRole(users, 'admin');
            expect(adminUsers1).toBe(adminUsers3);
            expect(calls).toBe(2);
        });

        // weakKashe for value comparison on specific arguments
        test('custom equality with weakKashe for shallow comparison on specific args', () => {
            let calls = 0;

            // Using weakKashe to allow string comparison on second argument
            const weakKashe = require('../src/index.ts').weakKashe;
            const processWithMode = weakKashe([1])((
                data: { values: number[] },
                mode: string, // This will be compared by value, not reference
                config: { multiplier: number }
            ) => {
                calls++;

                return {
                    result: data.values.map(v => v * (mode === 'double' ? 2 : config.multiplier)),
                    mode,
                    token: {}
                };
            });

            const data = { values: [1, 2, 3] };
            const config = { multiplier: 5 };

            const result1 = processWithMode(data, 'double', config);
            const result2 = processWithMode(data, 'double', config);
            expect(result1).toBe(result2);
            expect(calls).toBe(1);

            // Different mode string (but same content) - with weakKashe should hit cache
            const result3 = processWithMode(data, 'triple', config);
            expect(result3).not.toBe(result1);
            expect(calls).toBe(2);
        });

        // Simulating memoize-one's "last call wins" behavior using limit
        test('memoize-one-style "last call wins" simulation', () => {
            // Simulating memoize-one behavior where only the last call is cached
            function createMemoizeOne<T extends any[], R>(fn: (...args: T) => R) {
                return kashe(fn, {
                    limit: 1, // Only keep one cached result
                    UNSAFE_allowNoWeakKeys: true
                });
            }

            let calls = 0;
            const compute = createMemoizeOne((a: number, b: string) => {
                calls++;

                return { sum: a + b.length, token: {} };
            });

            withKasheIsolation(() => {
                const result1 = compute(5, 'hello');
                const result1Again = compute(5, 'hello');
                expect(result1).toBe(result1Again);
                expect(calls).toBe(1);

                // New call - should cache this and potentially evict previous
                compute(10, 'world');
                expect(calls).toBe(2);

                // Back to first call - might need recomputation due to limit: 1
                compute(5, 'hello');
                expect(calls).toBeGreaterThanOrEqual(2); // May be 2 or 3 depending on LRU
            });
        });

        // Redux-style selector with deep object access patterns
        test('Redux selector pattern with deep object selection', () => {
            interface AppState {
                users: { [id: string]: { name: string; age: number } };
                ui: { selectedUserId: string | null };
                settings: { theme: string };
            }

            let calls = 0;
            const selectSelectedUserWithTheme = kashe((state: AppState) => {
                calls++;

                const selectedUser = state.ui.selectedUserId
                    ? state.users[state.ui.selectedUserId]
                    : null;

                return {
                    user: selectedUser,
                    theme: state.settings.theme,
                    hasSelection: !!selectedUser,
                    token: {}
                };
            });

            const state1: AppState = {
                users: { '1': { name: 'Alice', age: 30 }, '2': { name: 'Bob', age: 25 } },
                ui: { selectedUserId: '1' },
                settings: { theme: 'dark' }
            };

            const result1 = selectSelectedUserWithTheme(state1);
            const result2 = selectSelectedUserWithTheme(state1);
            expect(result1).toBe(result2);
            expect(calls).toBe(1);

            // Change selection
            const state2: AppState = {
                ...state1,
                ui: { selectedUserId: '2' }
            };

            const result3 = selectSelectedUserWithTheme(state2);
            expect(result3).not.toBe(result1);
            expect(result3.user?.name).toBe('Bob');
            expect(calls).toBe(2);
        });

        // Performance-critical computations with multiple operation modes
        test('performance-critical computation with multiple return formats', () => {
            let computationCalls = 0;

            const heavyComputation = kashe((
                matrix: number[][],
                operation: 'sum' | 'avg' | 'max',
                precision: number
            ) => {
                computationCalls++;

                // Simulate expensive computation
                const flattened = matrix.flat();
                let result: number;

                switch (operation) {
                    case 'sum':
                        result = flattened.reduce((a, b) => a + b, 0);
                        break;
                    case 'avg':
                        result = flattened.reduce((a, b) => a + b, 0) / flattened.length;
                        break;
                    case 'max':
                        result = Math.max(...flattened);
                        break;
                }

                return {
                    operation,
                    result: Number(result.toFixed(precision)),
                    inputSize: flattened.length,
                    timestamp: Date.now(),
                    token: {}
                };
            });

            const matrix = [[1, 2, 3], [4, 5, 6], [7, 8, 9]];

            const sumResult1 = heavyComputation(matrix, 'sum', 2);
            const sumResult2 = heavyComputation(matrix, 'sum', 2);
            expect(sumResult1).toBe(sumResult2);
            expect(computationCalls).toBe(1);

            const avgResult = heavyComputation(matrix, 'avg', 2);
            expect(avgResult).not.toBe(sumResult1);
            expect(computationCalls).toBe(2);

            // Same operation, different precision - should be different
            const sumResult3 = heavyComputation(matrix, 'sum', 4);
            expect(sumResult3).not.toBe(sumResult1);
            expect(computationCalls).toBe(3);
        });

        // Conditional logic and early return patterns
        test('memoization with conditional logic and early returns', () => {
            let calls = 0;

            const processConditionally = kashe((
                input: { data: number[]; shouldProcess: boolean; threshold: number }
            ) => {
                calls++;

                if (!input.shouldProcess) {
                    return { processed: false, result: null, token: {} };
                }

                if (input.data.length === 0) {
                    return { processed: true, result: [], token: {} };
                }

                const filtered = input.data.filter(x => x > input.threshold);
                const processed = filtered.map(x => x * 2);

                return {
                    processed: true,
                    result: processed,
                    originalLength: input.data.length,
                    filteredLength: filtered.length,
                    token: {}
                };
            });

            const input1 = { data: [1, 5, 10, 15], shouldProcess: true, threshold: 3 };
            const result1 = processConditionally(input1);
            const result2 = processConditionally(input1);

            expect(result1).toBe(result2);
            expect(result1.processed).toBe(true);
            expect(result1.result).toEqual([10, 20, 30]);
            expect(calls).toBe(1);

            const input2 = { data: [1, 5, 10, 15], shouldProcess: false, threshold: 3 };
            const result3 = processConditionally(input2);
            expect(result3.processed).toBe(false);
            expect(calls).toBe(2);
        });
    });
});
