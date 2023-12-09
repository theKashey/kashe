import {WeakMappable, WeakStorage} from "./types";
import {isWeakable} from "./utils";

export const breakdownArgs = (args: any[]) => {
    let saveSlice = [];
    for (let i = 0; i < args.length; i++) {
        if (isWeakable(args[i])) {
            saveSlice.push(args[i]);
        }
    }
    return saveSlice;
}

type Test = {
    arguments?: any[];
    storedValue?: any;
    storage?: WeakMappable<Test>;
}

const testArgs = (test: Test, args: any[]) => {
    const a = test.arguments;
    if (!a) {
        return undefined;
    }
    if (a.length === args.length) {
        for (let i = 0; i < a.length; ++i) {
            if (a[i] !== args[i]) {
                return undefined;
            }
        }
        return test;
    }
    return undefined;
}

export const createWeakStorage = (storage: WeakMappable<Test> = new WeakMap()): WeakStorage => ({
    get(args) {
        const slices = breakdownArgs(args);
        if (!slices.length) {
            throw new Error(`No weak-mappable (object, function, symbol) arguments found.`);
        }
        let readFrom = storage;
        console.log('get breakdown', slices);
        for (let i = 0; i < slices.length; ++i) {
            const test = readFrom.get(slices[i]);
            if (!test || !test.storage) {
                console.log('get: no forward');
                return undefined
            }
            readFrom = test.storage;
        }
        if (!readFrom) {
            return undefined;
        }
        const test = readFrom.get(slices[0]);
        if (test) {
            const storedValue = testArgs(test, args);
            if (storedValue) {
                return {
                    value: test.storedValue,
                }
            } else {
                console.log('get: arg mismatch');
            }
        } else {
            console.log('get: no key');
        }

        return undefined;
    },

    set(args, value) {
        const slices = breakdownArgs(args);
        console.log('set breakdown', slices);
        let writeTo = storage;
        for (let i = 0; i < slices.length; ++i) {
            let next = writeTo.get(slices[i]);
            if (!next || !next.storage) {
                next = {
                    storage: new WeakMap()
                };
                writeTo.set(slices[i], next);
            }
            writeTo = next.storage!;
        }
        writeTo.set(slices[0], {
            storedValue: value,
            arguments: args,
            storage: undefined
        });
        return value;
    },
});