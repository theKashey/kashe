import {WeakMappable, WeakStorage} from "./types";

const weakable = (value: any): boolean => (
  value && (typeof value === 'object')
  // || typeof value === 'function' // not using function to prevent leaks
);

export const createWeakStorage = (indexId = 0, storage: WeakMappable = new WeakMap()): WeakStorage => ({
  get(args) {
    if (!weakable(args[indexId])) {
      console.log('arguments given', args);
      throw new Error(`Argument #${indexId} expected to be weak-mappable object, ${typeof args[indexId]} given`);
    }
    const test = storage.get(args[indexId]);
    if (test) {
      if (test.arguments.every((v: any, index: number) => v === args[index])) {
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


export const createStrongStorage = (startIndex = 0, endIndex = Infinity, storage: WeakMappable = new WeakMap()): WeakStorage => ({
  get(args) {
    const max = Math.min(endIndex, args.length);
    let reads = 0;
    for (let i = startIndex; i < max; ++i) {
      if (weakable(args[i])) {
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
      if (weakable(args[i])) {
        storage.set(args[i], {
          storedValue: value,
          arguments: args,
        })
      }
    }
    return value;
  }
});