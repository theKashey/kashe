import {configureCacheModel} from './cache.ts';
import {kashe, weakKashe, boxed, inboxed, fork, withIsolatedKashe} from "./weak.ts";
import {createWeakStorage} from "./weakStorage.ts";

export {
  kashe,
  weakKashe,
  boxed,
  inboxed,
  fork,
  withIsolatedKashe,
  configureCacheModel,
  createWeakStorage
};