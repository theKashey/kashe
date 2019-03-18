var weakable = function (value) { return (value && (typeof value === 'object')); };
export var createWeakStorage = function (indexId, storage) {
    if (indexId === void 0) { indexId = 0; }
    if (storage === void 0) { storage = new WeakMap(); }
    return ({
        get: function (args) {
            if (!weakable(args[indexId])) {
                console.log('arguments given', args);
                throw new Error("Argument #" + indexId + " expected to be weak-mappable object, " + typeof args[indexId] + " given");
            }
            var test = storage.get(args[indexId]);
            if (test) {
                if (test.arguments.every(function (v, index) { return v === args[index]; })) {
                    return {
                        value: test.storedValue,
                        index: indexId,
                    };
                }
            }
            return undefined;
        },
        set: function (args, value) {
            storage.set(args[indexId], {
                storedValue: value,
                arguments: args,
            });
            return value;
        },
    });
};
export var createStrongStorage = function (startIndex, endIndex, storage) {
    if (startIndex === void 0) { startIndex = 0; }
    if (endIndex === void 0) { endIndex = Infinity; }
    if (storage === void 0) { storage = new WeakMap(); }
    return ({
        get: function (args) {
            var max = Math.min(endIndex, args.length);
            var reads = 0;
            for (var i = startIndex; i < max; ++i) {
                if (weakable(args[i])) {
                    reads++;
                    var test_1 = storage.get(args[i]);
                    if (test_1) {
                        if (test_1.arguments.every(function (v, index) { return v === args[index]; })) {
                            return {
                                value: test_1.storedValue,
                                index: i,
                            };
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
        set: function (args, value) {
            var max = Math.min(endIndex, args.length);
            for (var i = startIndex; i < max; ++i) {
                if (weakable(args[i])) {
                    storage.set(args[i], {
                        storedValue: value,
                        arguments: args,
                    });
                }
            }
            return value;
        }
    });
};
