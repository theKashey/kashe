// copy of function-double package

function safeDefine<T, K extends keyof T>(
    target: T,
    key: K | string | symbol,
    descriptor: PropertyDescriptor
): void {
    try {
        Object.defineProperty(target, key, descriptor);
    } catch {
        // nop
    }
}

function transferProperties(source: object, target: object): void {
    const keys = [
        ...Object.getOwnPropertyNames(source),
        ...Object.getOwnPropertySymbols(source) as (string | symbol)[]
    ];

    for (const key of keys) {
        const desc = Object.getOwnPropertyDescriptor(source, key);

        if (desc) {
            safeDefine(target, key, desc);
        }
    }
}

interface FunctionDoubleOptions {
    name: string;
}

export function functionDouble<T extends Function, K extends Function>(
    targetFn: T,
    sourceFn: K,
    options: FunctionDoubleOptions
): K {
    // `length` is one of the transferred properties, it is configurable since ES2015
    transferProperties(sourceFn, targetFn);

    safeDefine(targetFn, 'toString', {
            configurable: true,
            writable: false,
            enumerable: false,
            value: function toString() {
                return String(sourceFn);
            }
        });

    if (options.name) {
        safeDefine(targetFn, 'name', {
            configurable: true,
            writable: false,
            enumerable: false,
            value: options.name
        });
    }

    return targetFn as unknown as K;
}