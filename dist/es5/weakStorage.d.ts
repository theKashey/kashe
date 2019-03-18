import { WeakMappable, WeakStorage } from "./types";
export declare const createWeakStorage: (indexId?: number, storage?: WeakMappable) => WeakStorage;
export declare const createStrongStorage: (startIndex?: number, endIndex?: number, storage?: WeakMappable) => WeakStorage;
