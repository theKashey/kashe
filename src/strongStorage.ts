import {WeakMappable, WeakStorage} from "./types";
import {isWeakable} from "./utils";

export const createStrongStorage = (startIndex = 0, endIndex = Infinity, storage: WeakMappable = new WeakMap()): WeakStorage => ({
  get(args) {
    const max = Math.min(endIndex, args.length);
    let reads = 0;
    for (let i = startIndex; i < max; ++i) {
      if (isWeakable(args[i])) {
        reads++;
        const test = storage.get(args[i]);
        if (test) {
          if (test.arguments.every((v: any, index: number) => v === args[index])) {
            return {
              value: test.storedValue,
              index: i,
            }
          }
        }
      }
    }
    if (!reads) {
      console.log('arguments given', args);
      throw new Error('No weak-mappable object found to read a result from');
    }

    return undefined;
  },

  set(args, value) {
    const max = Math.min(endIndex, args.length);
    for (let i = startIndex; i < max; ++i) {
      if (isWeakable(args[i])) {
        storage.set(args[i], {
          storedValue: value,
          arguments: args,
        })
      }
    }
    return value;
  }
});