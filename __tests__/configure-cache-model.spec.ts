import {syncCacheModel} from '../src/cache-models/sync-cache.ts';
import {configureCacheModel} from '../src/cache.ts';
import {withKasheIsolation} from '../src/index.ts';

describe('configureCacheModel', () => {
    afterEach(() => configureCacheModel(syncCacheModel));

    it('applies to a scope that was already used', () => {
        withKasheIsolation(() => undefined);

        const createCacheScope = jest.fn((_cache, fn) => fn());
        configureCacheModel(() => ({createCacheScope, getCacheFor: () => undefined}));

        withKasheIsolation(() => undefined);

        expect(createCacheScope).toHaveBeenCalledTimes(1);
    });
});
