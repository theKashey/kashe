import {configureCacheModel} from './cache';
import {kashe, weakKashe, boxed, inboxed, fork, withIsolatedKashe} from "./weak";
import {createWeakStorage} from "./weakStorage";

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