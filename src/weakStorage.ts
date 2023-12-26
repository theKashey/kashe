import {Mappable, WeakStorage} from "./types";
import {isWeakable} from "./utils";

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
    return [...weaks, ...strongs];
}

type Test = {
    storedValue?: any;
    strong?: Mappable<Test>;
    weak?: Mappable<Test>;
}

type StorageKeys = 'strong' | 'weak';

export const createWeakStorage = (storage: Mappable<Test> = new WeakMap()): WeakStorage => ({
    get(args) {
        const slices = breakdownArgs(args);
        if (!slices.length) {
            throw new Error(`No weak-mappable (object, function, symbol) argument found.`);
        }
        let readFrom = storage;
        let test: Test | undefined = {weak: storage}
        for (let i = 0; i < slices.length; ++i) {
            const storageKey:StorageKeys = isWeakable(slices[i]) ? 'weak' : 'strong';
            readFrom = test[storageKey];
            test = readFrom.get(slices[i]);
            if (!test) {
                // get: no forward
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
        const slices = breakdownArgs(args);
        let writeTo = storage;
        let next: Test = {weak: storage};
        for (let i = 0; i < slices.length; ++i) {
            const [storageKey, factory]:[StorageKeys,() => Mappable] = isWeakable(slices[i]) ? ['weak', () => new WeakMap()] : ['strong', () => new Map()];
            writeTo = next[storageKey];
            if (!writeTo) {
                next[storageKey] = writeTo = factory();
            }
            next = writeTo.get(slices[i]);
            if (!next || !next[storageKey]) {
                next = {
                    [storageKey]: factory()
                };
                writeTo.set(slices[i], next);
            }
        }

        next.storedValue = value;
        return value;
    },
});