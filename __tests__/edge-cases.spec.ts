/**
 * @fileoverview Edge case tests for kashe core functionality
 *
 * These tests cover edge cases, error conditions, and boundary scenarios
 * that are critical for a production-ready memoization library.
 */

import { kashe, boxed, weakKashe, resetKashe } from '../src/index.ts';

describe('Kashe Edge Cases and Error Handling', () => {
    afterEach(() => {
        resetKashe();
    });

    describe('memory limits and large datasets', () => {
        test('should respect limit option for primitive values', () => {
            const fn = kashe((value: number) => ({ value, computed: value * 2 }), {
                UNSAFE_allowNoWeakKeys: true,
                limit: 3
            });

            // Fill cache to limit
            const results = [];

            for (let i = 0; i < 5; i++) {
                results.push(fn(i));
            }

            // last one still be cached
            expect(fn(4)).toBe(results[4]);
            expect(fn(3)).toBe(results[3]);
            expect(fn(2)).toBe(results[2]);
            // removed from cache
            expect(fn(1)).not.toBe(results[1]);
        });
    });

    describe('function identity and context handling', () => {
        test('should handle functions with same string representation but different closures', () => {
            const createFunction = (multiplier: number) => (x: number) => x * multiplier;

            const fn = weakKashe([1])((obj: any, func: Function) => ({
                obj,
                func: func.toString(),
                result: func(5)
            }));

            const obj = {};
            const func1 = createFunction(2);
            const func2 = createFunction(3);

            // Same string representation but different behavior
            expect(func1.toString()).toBe(func2.toString());

            const result1 = fn(obj, func1);
            const result2 = fn(obj, func2); // Should cache hit due to same string

            expect(result1).toBe(result2);
            expect(result1.result).toBe(10); // Uses first function's behavior
        });

        test('should handle bound functions correctly', () => {
            const fn = kashe((func: Function, value: number) => ({
                result: func(value),
                timestamp: Date.now()
            }));

            const baseFunc = function(this: any, x: number) {
                return this.multiplier * x;
            };

            const context = { multiplier: 3 };
            const boundFunc = baseFunc.bind(context);

            const result1 = fn(boundFunc, 5);
            const result2 = fn(boundFunc, 5);

            expect(result1).toBe(result2);
            expect(result1.result).toBe(15);
        });

        test('should handle arrow functions vs regular functions', () => {
            const fn = kashe((func: Function) => ({
                type: func.name || 'anonymous',
                result: func(10)
            }));

            const regularFunc = function multiply(x: number) { return x * 2; };

            const arrowFunc = (x: number) => x * 2;

            const result1 = fn(regularFunc);
            const result2 = fn(regularFunc);
            const result3 = fn(arrowFunc);
            const result4 = fn(arrowFunc);

            expect(result1).toBe(result2);
            expect(result3).toBe(result4);
            expect(result1).not.toBe(result3);
        });
    });

    describe('async function handling', () => {
        test('should handle async functions correctly', async () => {
            let callCount = 0;
            const asyncFn = kashe(async (obj: any, delay: number) => {
                callCount++;
                await new Promise(resolve => setTimeout(resolve, delay));

                return { obj, delay, callCount };
            });

            const testObj = {};

            const promise1 = asyncFn(testObj, 10);
            const promise2 = asyncFn(testObj, 10);

            // Same promises should be returned
            expect(promise1).toBe(promise2);

            const result = await promise1;
            expect(result.callCount).toBe(1);
            expect(callCount).toBe(1);
        });

        test('should handle rejected promises correctly', async () => {
            let callCount = 0;
            const rejectingFn = kashe(async (obj: any, shouldReject: boolean) => {
                callCount++;

                if (shouldReject) {
                    throw new Error('Test error');
                }

                return { obj, callCount };
            });

            const testObj = {};

            const promise1 = rejectingFn(testObj, true);
            const promise2 = rejectingFn(testObj, true);

            expect(promise1).toBe(promise2);

            await expect(promise1).rejects.toThrow('Test error');
            expect(callCount).toBe(1);
        });
    });

    describe('generator function handling', () => {
        test('should handle generator functions', () => {
            const genFn = kashe(function* (obj: any, count: number) {
                for (let i = 0; i < count; i++) {
                    yield { obj, value: i };
                }
            });

            const testObj = {};

            const gen1 = genFn(testObj, 3);
            const gen2 = genFn(testObj, 3);

            expect(gen1).toBe(gen2);

            const results = Array.from(gen1);
            expect(results).toHaveLength(3);
            expect(results[0].value).toBe(0);
            expect(results[2].value).toBe(2);
        });
    });

    describe('error boundary testing', () => {
        test('should handle exceptions during function execution', () => {
            let callCount = 0;
            const throwingFn = kashe((obj: any, shouldThrow: boolean) => {
                callCount++;

                if (shouldThrow) {
                    throw new Error('Intentional error');
                }

                return { obj, callCount };
            });

            const testObj = {};

            // First call throws
            expect(() => throwingFn(testObj, true)).toThrow('Intentional error');
            expect(callCount).toBe(1);

            // Second call with same args should throw again (no caching of errors)
            expect(() => throwingFn(testObj, true)).toThrow('Intentional error');
            expect(callCount).toBe(2);

            // Successful call should work normally
            const result = throwingFn(testObj, false);
            expect(result.callCount).toBe(3);
            expect(callCount).toBe(3);
        });

        test('should handle errors in serializer functions', () => {
            const fn = kashe((obj: any) => ({ obj, timestamp: Date.now() }), {
                serializer: {
                    writeTo: (value) => {
                        if (value.obj.shouldFailSerialization) {
                            throw new Error('Serialization failed');
                        }

                        return value;
                    },
                    readFrom: (value) => value
                }
            });

            const goodObj = { name: 'good' };
            const badObj = { name: 'bad', shouldFailSerialization: true };

            // Good object should work
            const result1 = fn(goodObj);
            const result2 = fn(goodObj);
            expect(result1).toBe(result2);

            // Bad object should throw during serialization
            expect(() => fn(badObj)).toThrow('Serialization failed');
        });
    });

    describe('boxed edge cases', () => {
        test('should handle boxed functions with no additional arguments', () => {
            const fn = boxed(() => ({ timestamp: Date.now() }));

            const cacheKey = {};

            const result1 = fn(cacheKey);
            const result2 = fn(cacheKey);

            expect(result1).toBe(result2);
        });

        test('should handle boxed functions with undefined cache key', () => {
            const fn = boxed((value: number) => ({ value, doubled: value * 2 }));

            expect(() => fn(undefined as any, 5)).toThrow();
        });
    });

    describe('concurrent access patterns', () => {
        test('should handle concurrent calls to same function safely', async () => {
            let resolveCount = 0;
            const slowFn = kashe(async (obj: any, value: number) => {
                await new Promise(resolve => setTimeout(resolve, 10));
                resolveCount++;

                return { obj, value, resolveCount };
            });

            const testObj = {};

            // Start multiple concurrent calls
            const promises = Array.from({ length: 5 }, () => slowFn(testObj, 42));

            const results = await Promise.all(promises);

            // All should return the same cached result
            results.forEach(result => {
                expect(result).toBe(results[0]);
            });

            expect(resolveCount).toBe(1); // Only one actual execution
        });
    });
});
