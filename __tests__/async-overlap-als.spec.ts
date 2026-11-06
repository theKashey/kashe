import {asyncLocalStorageModel} from '../src/cache-models/async-local-storage-cache.ts';
import {configureCacheModel} from '../src/cache.ts';
import {kashe, withKasheIsolation} from '../src/index.ts';

const deferred = () => {
    let resolve!: () => void;
    const promise = new Promise<void>((done) => {
        resolve = done;
    });

    return {promise, resolve};
};

describe('async local storage model with overlapping scopes', () => {
    configureCacheModel(asyncLocalStorageModel);

    it('keeps every scope on its own cache across awaits, whichever settles first', async () => {
        const fn = kashe((_key: object) => ({}));
        const key = {};
        const gateA = deferred();
        const gateB = deferred();

        const inside = async (gate: Promise<void>) => {
            const before = fn(key);
            await gate;

            return [before, fn(key)];
        };

        const scopeA = withKasheIsolation(() => inside(gateA.promise));
        const scopeB = withKasheIsolation(() => inside(gateB.promise));

        gateA.resolve();

        const [beforeA, afterA] = await scopeA;
        gateB.resolve();

        const [beforeB, afterB] = await scopeB;

        expect(afterA).toBe(beforeA);
        expect(afterB).toBe(beforeB);
        expect(beforeA).not.toBe(beforeB);
        expect(fn(key)).not.toBe(beforeA);
        expect(fn(key)).not.toBe(beforeB);
    });
});
