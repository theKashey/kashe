/// <reference lib="es2021.weakref" />
import {setFlagsFromString} from 'v8';
import {runInNewContext} from 'vm';

import {kashe} from '../src';

setFlagsFromString('--expose-gc');
const collectGarbage: () => void = runInNewContext('gc');

const collected = async (ref: WeakRef<object>) => {
    for (let attempt = 0; attempt < 20 && ref.deref(); attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 0));
        collectGarbage();
    }

    return ref.deref() === undefined;
};

describe('argument positions are part of the cache key', () => {
    it('does not share a result between (object, primitive) and (primitive, object)', () => {
        const object = {};
        const fn = kashe((...args: unknown[]) => args.map((arg) => typeof arg).join());

        expect(fn(object, 1)).toBe('object,number');
        expect(fn(1, object)).toBe('number,object');
    });

    it('does not share a result between two interleavings of the same objects', () => {
        const a = {};
        const b = {};
        const fn = kashe((...args: unknown[]) => args.map((arg) => typeof arg).join());

        expect(fn(a, 1, b)).toBe('object,number,object');
        expect(fn(a, b, 1)).toBe('object,object,number');
        expect(fn(1, a, b)).toBe('number,object,object');
    });

    it('still hits the cache for the same arguments in the same order', () => {
        const object = {};
        const compute = jest.fn((...args: unknown[]) => args.length);
        const fn = kashe(compute);

        fn(object, 1);
        fn(1, object);
        fn(object, 1);
        fn(1, object);

        expect(compute).toHaveBeenCalledTimes(2);
    });

    it('does not answer a shorter call from an entry of a longer one', () => {
        const object = {};
        const fn = kashe((...args: unknown[]) => args.length);

        expect(fn(object, 1)).toBe(2);
        expect(fn(object)).toBe(1);
    });

    it('does not answer a longer call from an entry of a shorter one', () => {
        const object = {};
        const fn = kashe((...args: unknown[]) => args.length);

        expect(fn(object)).toBe(1);
        expect(fn(object, 1)).toBe(2);
        expect(fn(object)).toBe(1);
    });
});

describe('the cache holds its keys weakly', () => {
    const fn = kashe((...args: unknown[]) => ({args: args.length}));

    it.each([
        ['object first', (key: object) => [key, 1]],
        ['primitive first', (key: object) => [1, key]],
        ['between primitives', (key: object) => [1, key, 2]],
    ])('releases the object key when it is %s', async (_, argsFor) => {
        const anchor = {};
        let ref: WeakRef<object>;

        (() => {
            const key = {};
            ref = new WeakRef(key);
            fn(anchor, ...argsFor(key));
        })();

        expect(await collected(ref!)).toBe(true);
        expect(anchor).toBeDefined();
    });

    it('releases the cached result together with its only object key', async () => {
        let ref: WeakRef<object>;

        (() => {
            const key = {};
            ref = new WeakRef(fn(1, key));
        })();

        expect(await collected(ref!)).toBe(true);
    });
});
