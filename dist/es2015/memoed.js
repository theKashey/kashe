export function weakMemoize(func, cacheEntry) {
    if (cacheEntry === void 0) { cacheEntry = new WeakMap(); }
    var cache = cacheEntry;
    return function (arg) {
        var rest = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            rest[_i - 1] = arguments[_i];
        }
        var test = cache.get(arg);
        if (test) {
            if (test.arguments.every(function (v, index) { return v === rest[index]; })) {
                return test.storedValue;
            }
        }
        var ret = func.apply(void 0, [arg].concat(rest));
        cache.set(arg, {
            storedValue: ret,
            arguments: rest,
        });
        return ret;
    };
}
export function swap(fn) {
    return function (k, t) { return fn(t, k); };
}
export function boxed(fn) {
    return weakMemoize(function (state) {
        var rest = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            rest[_i - 1] = arguments[_i];
        }
        return fn.apply(void 0, rest);
    });
}
;
