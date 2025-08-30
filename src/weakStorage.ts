import type {Mappable, WeakStorage} from "./types.ts";
import {isWeakable} from "./utils.ts";

/**
 * Splits argiments into weak-mappable and _plain_ ones
 */
export const breakdownArgs = (args: any[]) => {
    const weaks = [];
    const strongs = [];

    for (let i = 0; i < args.length; i++) {
        if (isWeakable(args[i])) {
            weaks.push(args[i]);
        } else {
            strongs.push(args[i])
        }
    }

    return [weaks, strongs];
}

type Test = {
    storedValue?: any;
    strong?: Mappable<Test>;
    weak?: Mappable<Test>;
    overflowed?: boolean;
}

/**
 * creates a "recursive weak storage" - a structure that can store a value using a chain of keys
 * at least one of the keys must be a weak-mappable value (object, function, or symbol).
 *
 * This is a general purpose weak storage, which can be used to store values using a chain of keys.
 * @example
 * ```ts
 * import {createWeakStorage} from 'kashe';
 * const storage = createWeakStorage();
 * // store a value using a chain of keys
 * const objectKey = {};
 * storage.set([objectKey, 'key1', 'key2'], 'value');
 * // read a value using the same chain of keys
 * const value = storage.get([objectKey, 'key1', 'key2']);
 * ```
 */
export const createWeakStorage = (storage: Mappable<Test> = new WeakMap()): WeakStorage => ({
    get(args) {
        const [weaks, strongs] = breakdownArgs(args);

        let readFrom: Mappable<Test> | undefined = storage;
        let test: Test | undefined = {weak: storage}

        for (let i = 0; i < weaks.length; ++i) {
            readFrom = test.weak;
            test = readFrom?.get(weaks[i]);

            if (!test) {
                return undefined
            }
        }

        for (let i = 0; i < strongs.length; ++i) {
            const current = test;
            readFrom = test.strong;
            test = readFrom?.get(strongs[i]);

            if (!test) {
                return undefined
            }

            // emulate LRU by reinserting the key
            if(current.overflowed) {
                const mapBase = readFrom as Map<any, Test>;
                mapBase.delete(strongs[i]);
                mapBase.set(strongs[i], test);
            }
        }

        if (!readFrom) {
            return undefined;
        }

        return {
            value: test.storedValue,
        }
    },

    set(args, value, options) {
        const [weaks,strongs] = breakdownArgs(args);

        if (!weaks.length && !options?.UNSAFE_allowNoWeakKeys) {
            throw new Error(`No weak-mappable (object, function, symbol) argument found.`);
        }

        let writeTo: Mappable<Test> | undefined = storage;
        let next: Test | undefined = {weak: storage};

        // pass for weak-mappable arguments
        for (let i = 0; i < weaks.length; ++i) {
            writeTo = next.weak;

            if (!writeTo) {
                next.weak = writeTo = new WeakMap();
            }

            next = writeTo.get(weaks[i]);

            if (!next || !next.weak) {
                next = {
                    weak: new WeakMap()
                };

                writeTo.set(weaks[i], next);
            }
        }

        // pass for POJO arguments
        for (let i = 0; i < strongs.length; ++i) {
            const current=next;
            writeTo = next.strong;

            if (!writeTo) {
                next.strong = writeTo = new Map();
            }

            next = writeTo.get(strongs[i]);

            if (!next || !next.strong) {
                next = {
                   strong: new Map(),
                };

                if(options?.limit) {
                    const mapBase = writeTo as Map<any, Test>;

                    // if we are going above limit - remove the first(oldest?) key
                    if (mapBase.size >= options.limit) {
                        const firstKey = mapBase.keys().next().value;
                        mapBase.delete(firstKey);
                        current.overflowed = true;
                    }
                }

                writeTo.set(strongs[i], next);
            }
        }

        next.storedValue = value;

        return value;
    },
});