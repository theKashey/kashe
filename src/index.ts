import {configureCacheModel} from './cache.ts';
import {kashe, weakKashe, boxed, inboxed, fork, withKasheIsolation, resetKashe} from "./weak.ts";
import {createWeakStorage} from "./weakStorage.ts";

export {
    kashe,
    weakKashe,
    boxed,
    inboxed,
    fork,
    withKasheIsolation,
    configureCacheModel,
    resetKashe,
    createWeakStorage
};