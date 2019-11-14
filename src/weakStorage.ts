import {WeakMappable, WeakStorage} from "./types";
import {isWeakable} from "./utils";

export const createWeakStorage = (indexId = 0, storage: WeakMappable = new WeakMap()): WeakStorage => ({
  get(args) {
    if (!isWeakable(args[indexId])) {
      console.log('arguments given', args);
      throw new Error(`Argument #${indexId} expected to be weak-mappable object, ${typeof args[indexId]} given`);
    }
    const test = storage.get(args[indexId]);
    if (test) {
      const a = test.arguments;
      if (a.length === args.length) {
        for (let i = 0; i < a.length; ++i) {
          if (a[i] !== args[i]) {
            return undefined;
          }
        }
        return {
          value: test.storedValue,
          index: indexId,
        }
      }
    }

    return undefined;
  },

  set(args, value) {
    storage.set(args[indexId], {
      storedValue: value,
      arguments: args,
    });
    return value;
  },
});