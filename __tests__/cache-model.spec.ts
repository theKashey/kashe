import {kashe, fork} from "../src";
import {syncCache} from "../src/cache-models/sync-cache";
import {asyncNodeCache} from "../src/cache-models/async-node-cache";
import {configureCacheModel} from "../src/cache";

describe('sync', () => {
    const STABLE_OBJECT = {};
    const test = kashe((_x) => ({}));

    const world1 = fork(test);
    const world2 = fork(test);

    it('sync cache', () => {
        configureCacheModel(syncCache);
        expect(world1(STABLE_OBJECT)).not.toBe(world2(STABLE_OBJECT));
    })
    it('async cache', () => {
        configureCacheModel(asyncNodeCache);
        expect(world1(STABLE_OBJECT)).not.toBe(world2(STABLE_OBJECT));
    })
});