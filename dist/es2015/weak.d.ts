import { WeakStorage } from "./types";
export declare const kashe: <Arg extends object, T extends any[], Return>(func: (x: Arg, ...rest: T) => Return, cache?: WeakStorage) => (x: Arg, ...rest: T) => Return;
export declare const strongMemoize: <Arg extends object, T extends any[], Return>(func: (x: Arg, ...rest: T) => Return, cache?: WeakStorage) => (x: Arg, ...rest: T) => Return;
export declare function swap<T, K, R>(fn: (t: T, k: K) => R): (k: K, T: T) => R;
declare type BoxedCall<T extends any[], K> = (state: object, ...rest: T) => K;
export declare function boxed<T extends any[], K>(fn: (...args: T) => K): BoxedCall<T, K>;
export declare function inboxed<T extends any[], K>(fn: (...args: T) => K): BoxedCall<T, K>;
export declare function fork<T extends any[], K>(fn: (...args: T) => K): (...args: T) => K;
export {};
