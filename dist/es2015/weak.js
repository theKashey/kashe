import functionDouble from "function-double";
import { createStrongStorage, createWeakStorage } from "./weakStorage";
var cacheStack = [];
var cacheOverride;
var pushCache = function (cache) {
    cacheStack.push(cache);
    cacheOverride = cache;
};
var popCache = function (cache) {
    if (cache !== cacheStack.pop()) {
        throw new Error('kashe synchronization failed');
    }
    cacheOverride = cacheStack[cacheStack.length - 1];
};
var addKashePrefix = function (name) { return "kashe-" + name; };
function weakMemoizeCreator(cacheCreator) {
    if (cacheCreator === void 0) { cacheCreator = createWeakStorage; }
    return function kasheCreator(func, cache) {
        if (cache === void 0) { cache = cacheCreator(); }
        return functionDouble(function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            var localCache = cacheOverride || cache;
            var test = localCache.get(args);
            if (test) {
                return test.value;
            }
            return localCache.set(args, func.apply(void 0, args));
        }, func, { name: addKashePrefix });
    };
}
function weakKasheFactory(func, indexId) {
    if (indexId === void 0) { indexId = 0; }
    var cache = createWeakStorage();
    return function kasheFactory() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        var localCache = cacheOverride || cache;
        var cacheArg = [args[indexId]];
        var test = localCache.get(cacheArg);
        if (test) {
            return test.value;
        }
        return localCache.set(cacheArg, func.apply(void 0, args));
    };
}
export var kashe = weakMemoizeCreator(createWeakStorage);
export var strongMemoize = weakMemoizeCreator(createStrongStorage);
export function swap(fn) {
    return function (k, t) { return fn(t, k); };
}
export function boxed(fn) {
    return kashe(function (_) {
        var rest = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            rest[_i - 1] = arguments[_i];
        }
        return fn.apply(void 0, rest);
    });
}
var localCacheCreator = kashe(function (_) { return createWeakStorage(); });
export function inboxed(fn) {
    var factory = weakKasheFactory(function (cacheVariation) {
        var cache = localCacheCreator(cacheVariation);
        return function () {
            var rest = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                rest[_i] = arguments[_i];
            }
            try {
                pushCache(cache);
                return fn.apply(void 0, rest);
            }
            finally {
                popCache(cache);
            }
        };
    });
    return function (_) {
        var rest = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            rest[_i - 1] = arguments[_i];
        }
        return factory(_).apply(void 0, rest);
    };
}
export function fork(fn) {
    var cache = localCacheCreator({});
    return function () {
        var rest = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            rest[_i] = arguments[_i];
        }
        try {
            pushCache(cache);
            return fn.apply(void 0, rest);
        }
        finally {
            popCache(cache);
        }
    };
}
