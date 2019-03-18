import { WeakMappable } from "./types";
export declare function weakMemoize<Arg extends object, Return, K extends object>(func: (x: Arg, ...rest: any[]) => Return, cacheEntry?: WeakMappable): (x: Arg, ...rest: any[]) => Return;
export declare function swap<T, K, R>(fn: (t: T, k: K) => R): (k: K, T: T) => R;
declare type BoxedCall<T extends any[], K> = (state: object, ...r: T) => K;
export declare function boxed<T extends any[], K>(fn: (...args: T) => K): BoxedCall<T, K>;
export {};
