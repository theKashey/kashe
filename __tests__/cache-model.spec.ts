import {asyncLocalStorageModel} from "../src/cache-models/async-local-storage-cache.ts";
import {syncCacheModel} from "../src/cache-models/sync-cache.ts";
import {configureCacheModel} from "../src/cache.ts";
import {kashe, fork} from "../src/index.ts";

describe('sync', () => {
    const STABLE_OBJECT = {};
     
    const test = kashe((_x) => ({}));

    const world1 = fork(test);
    const world2 = fork(test);

    it('sync cache', () => {
        configureCacheModel(syncCacheModel);
        expect(world1(STABLE_OBJECT)).not.toBe(world2(STABLE_OBJECT));
    })

    it('async cache', () => {
        configureCacheModel(asyncLocalStorageModel);
        expect(world1(STABLE_OBJECT)).not.toBe(world2(STABLE_OBJECT));
    })
});

describe('slices', () => {
    it('allows controlling cache model', () => {
        const heap1 = {index: 0};
        const heap2 = {index: 100};
        let currentHeap = heap1;

        const reality1 = {};
        const reality2 = {};

        let currentReality = reality1;
        const getReality = () => currentReality;


         
        const fn = kashe((_x) => currentHeap.index++, {resolver: getReality});

        const key = {};

        expect(fn(key)).toBe(0);
        expect(fn(key)).toBe(0);

        // switch to another reality
        currentReality = reality2;
        currentHeap = heap2;

        expect(fn(key)).toBe(100);
        expect(fn(key)).toBe(100);

        // switch to another reality
        currentReality = reality1;
        currentHeap = heap1;

        expect(fn(key)).toBe(0);
        expect(fn({})).toBe(1);
    });
});