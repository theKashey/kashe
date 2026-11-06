/// <reference lib="es2021.weakref" />
import {setFlagsFromString} from 'v8';
import {runInNewContext} from 'vm';

import {syncCacheModel} from '../src/cache-models/sync-cache.ts';
import {configureCacheModel} from '../src/cache.ts';
import {kashe, withKasheIsolation} from '../src';

setFlagsFromString('--expose-gc');
const collectGarbage: () => void = runInNewContext('gc');

const collected = async (ref: WeakRef<object>) => {
    for (let attempt = 0; attempt < 20 && ref.deref(); attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 0));
        collectGarbage();
    }

    return ref.deref() === undefined;
};

describe('cache scopes', () => {
    it('does not keep an object scope alive', async () => {
        let ref: WeakRef<object>;

        (() => {
            const scope = {};
            ref = new WeakRef(scope);
            withKasheIsolation(() => undefined, {scope});
        })();

        expect(await collected(ref!)).toBe(true);
    });

    it('keeps one model for an object scope while it lives', () => {
        const scope = {};
        const key = {};
        const fn = kashe((_key: object) => ({}), {scope});
        const pointer = {};

        expect(withKasheIsolation(() => fn(key), {scope, pointer}))
            .toBe(withKasheIsolation(() => fn(key), {scope, pointer}));
    });

    it('keeps one model per primitive scope', () => {
        const create = jest.fn(syncCacheModel);
        configureCacheModel(create);

        withKasheIsolation(() => undefined, {scope: 'a'});
        const known = create.mock.calls.length;

        withKasheIsolation(() => undefined, {scope: 'a'});
        expect(create).toHaveBeenCalledTimes(known);

        withKasheIsolation(() => undefined, {scope: Symbol.for('b')});
        expect(create).toHaveBeenCalledTimes(known + 1);

        configureCacheModel(syncCacheModel);
    });
});
