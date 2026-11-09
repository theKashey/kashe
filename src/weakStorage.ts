import type {Mappable, WeakStorage} from "./types.ts";
import {isWeakable} from "./utils.ts";

/**
 * Splits arguments into weak-mappable and _plain_ ones.
 *
 * Weak keys are walked first, so an entry lives only as long as all of them: primitives sit in
 * Maps owned by the last weak node and no Map ever holds an object key. That walk forgets where
 * each argument stood, so the first plain key is the call's shape, one letter per position.
 * It keeps `(obj, 1)` and `(1, obj)` apart, and `(obj)` from the middle of the path of `(obj, 1)`.
 */
export const breakdownArgs = (args: any[]) => {
    const weaks = [];
    const strongs: any[] = [''];
    let shape = '';

    for (let i = 0; i < args.length; i++) {
        if (isWeakable(args[i])) {
            weaks.push(args[i]);
            shape += 'w';
        } else {
            strongs.push(args[i]);
            shape += 's';
        }
    }

    strongs[0] = shape;

    return [weaks, strongs];
}

type Test = {
    storedValue?: any;
    strong?: Mappable<Test>;
    weak?: Mappable<Test>;
    limited?: boolean;
}

/**
 * creates a "recursive weak storage" - a structure that can store a value using a chain of keys
 * at least one of the keys must be a weak-mappable value (object or function).
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
export const createWeakStorage = (storage: Mappable<Test> = new WeakMap()): WeakStorage => {
    const start: Test = {weak: storage};

    return {
    get(args) {
        const [weaks, strongs] = breakdownArgs(args);

        let readFrom: Mappable<Test> | undefined = storage;
        let test: Test | undefined = start;

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
            if(current.limited) {
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

    set(args, value, options= {}) {
        const [weaks,strongs] = breakdownArgs(args);

        if (options?.shouldCheckWeakArguments!==false && weaks.length<(options.minimalWeakArguments || 1) && !options.UNSAFE_allowNoWeakKeys) {
            throw new Error(`No weak-mappable (object, function) argument found.`);
        }

        let writeTo: Mappable<Test> | undefined = storage;
        let next: Test | undefined = start;

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

                    // reads keep the order from the first entry on, the limit is only known here
                    current.limited = true;

                    // if we are going above limit - remove the first(oldest?) key
                    if (mapBase.size >= options.limit) {
                        const firstKey = mapBase.keys().next().value;
                        mapBase.delete(firstKey);
                    }
                }

                writeTo.set(strongs[i], next);
            }
        }

        next.storedValue = value;

        return value;
    },
}}