"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var function_double_1 = require("function-double");
var weakStorage_1 = require("./weakStorage");
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
    if (cacheCreator === void 0) { cacheCreator = weakStorage_1.createWeakStorage; }
    return function kasheCreator(func, cache) {
        if (cache === void 0) { cache = cacheCreator(); }
        return function_double_1.default(function () {
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
    var cache = weakStorage_1.createWeakStorage();
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
exports.kashe = weakMemoizeCreator(weakStorage_1.createWeakStorage);
exports.strongMemoize = weakMemoizeCreator(weakStorage_1.createStrongStorage);
function swap(fn) {
    return function (k, t) { return fn(t, k); };
}
exports.swap = swap;
function boxed(fn) {
    return exports.kashe(function (_) {
        var rest = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            rest[_i - 1] = arguments[_i];
        }
        return fn.apply(void 0, rest);
    });
}
exports.boxed = boxed;
var localCacheCreator = exports.kashe(function (_) { return weakStorage_1.createWeakStorage(); });
function inboxed(fn) {
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
exports.inboxed = inboxed;
function fork(fn) {
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
exports.fork = fork;
