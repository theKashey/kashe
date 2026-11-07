import {syncCacheModel} from '../src/cache-models/sync-cache.ts';
import {createWeakStorage, kashe, withKasheIsolation} from '../src/index.ts';

const deferred = () => {
    let resolve!: () => void;
    const promise = new Promise<void>((done) => {
        resolve = done;
    });

    return {promise, resolve};
};

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('sync cache model with overlapping async scopes', () => {
    it('closes scopes that settle out of order', async () => {
        const report = jest.spyOn(console, 'error').mockImplementation(() => undefined);
        const fn = kashe((_key: object) => ({}));
        const key = {};
        const first = deferred();
        const second = deferred();
        const seen: object[] = [];

        const scopeA = withKasheIsolation(async () => {
            await first.promise;
        });

        const scopeB = withKasheIsolation(async () => {
            seen.push(fn(key));
            await second.promise;
            seen.push(fn(key));
        });

        first.resolve();
        await scopeA;
        await tick();
        second.resolve();
        await scopeB;
        await tick();

        expect(seen[0]).toBe(seen[1]);
        expect(report).not.toHaveBeenCalled();
        expect(fn(key)).not.toBe(seen[0]);

        report.mockRestore();
    });

    it('keeps the cache of a scope that shares it with one settling earlier', async () => {
        const {createCacheScope, getCacheFor} = syncCacheModel();
        const shared = createWeakStorage();
        const other = createWeakStorage();
        const fn = () => undefined;
        const active = () => getCacheFor(fn, createWeakStorage);
        const first = deferred();
        const second = deferred();
        const third = deferred();

        const scopes = [
            createCacheScope(shared, () => first.promise),
            createCacheScope(other, () => second.promise),
            createCacheScope(shared, () => third.promise),
        ];
        const before = active();

        first.resolve();
        await scopes[0];
        await tick();

        expect(active()).toBe(before);

        second.resolve();
        await scopes[1];
        await tick();

        expect(active()).toBe(before);

        third.resolve();
        await scopes[2];
        await tick();

        expect(active()).toBeUndefined();
    });

    it('closes a scope once when its thenable settles twice', async () => {
        const {createCacheScope, getCacheFor} = syncCacheModel();
        const fn = () => undefined;
        const active = () => getCacheFor(fn, createWeakStorage);
        const outer = deferred();
        const settlesTwice = {
            then: (resolved: () => void, rejected: () => void) => {
                resolved();
                rejected();
            },
        };

        const scope = createCacheScope(createWeakStorage(), () => outer.promise);
        const before = active();

        createCacheScope(createWeakStorage(), () => settlesTwice);

        expect(active()).toBe(before);

        outer.resolve();
        await scope;
    });

    it('closes a sync scope around an async scope that is still pending', async () => {
        const report = jest.spyOn(console, 'error').mockImplementation(() => undefined);
        const inner = deferred();
        let pending: Promise<void>;

        expect(() => {
            withKasheIsolation(() => {
                pending = withKasheIsolation(async () => {
                    await inner.promise;
                });
            });
        }).not.toThrow();

        inner.resolve();
        await pending!;
        await tick();

        expect(report).not.toHaveBeenCalled();
        report.mockRestore();
    });
});
