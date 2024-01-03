import {Mappable, WeakStorage} from "./types";
import {isWeakable} from "./utils";

/**
 * Splits argiments into weak-mappable and _plain_ ones
 */
export const breakdownArgs = (args: any[]) => {
    let weaks = [];
    let strongs = [];
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
}

type StorageKeys = 'strong' | 'weak';

export const createWeakStorage = (storage: Mappable<Test> = new WeakMap()): WeakStorage => ({
    get(args) {
        const [weaks, strongs] = breakdownArgs(args);
        if (!weaks.length) {
            throw new Error(`No weak-mappable (object, function, symbol) argument found.`);
        }
        let readFrom = storage;
        let test: Test | undefined = {weak: storage}
        for (let i = 0; i < weaks.length; ++i) {
            readFrom = test.weak;
            test = readFrom.get(weaks[i]);
            if (!test) {
                return undefined
            }
        }
        for (let i = 0; i < strongs.length; ++i) {
            readFrom = test.strong;
            test = readFrom.get(strongs[i]);
            if (!test) {
                return undefined
            }
        }
        if (!readFrom) {
            return undefined;
        }
        return {
            value: test.storedValue,
        }
    },

    set(args, value) {
        const [weaks,strongs] = breakdownArgs(args);
        let writeTo = storage;
        let next: Test = {weak: storage};

        for (let i = 0; i < weaks.length; ++i) {
            writeTo = next.weak;
            if (!writeTo) {
                next.weak = writeTo = new WeakMap();
            }
            next = writeTo.get(weaks[i]);
            if (!next || !next.weak) {
                next = {
                    weak: new WeakMap();
                };
                writeTo.set(weaks[i], next);
            }
        }

        for (let i = 0; i < strongs.length; ++i) {
            writeTo = next.strong;
            if (!writeTo) {
                next.strong = writeTo = new Map();
            }
            next = writeTo.get(strongs[i]);
            if (!next || !next.strong) {
                next = {
                    strong: new Map(),
                };
                writeTo.set(strongs[i], next);
            }
        }

        next.storedValue = value;
        return value;
    },
});