import {configureCacheModel} from './cache.ts';
import {kashe, weakKashe, boxed, inboxed, fork, withKasheIsolation} from "./weak.ts";
import {createWeakStorage} from "./weakStorage.ts";

export {
  kashe,
  weakKashe,
  boxed,
  inboxed,
  fork,
  withKasheIsolation,
  configureCacheModel,
  createWeakStorage
};