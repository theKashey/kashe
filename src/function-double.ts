// copy of util-arity  package
const FUNCTIONS: Record<number, (fn: Function) => Function> = {};

function setArity(arity: number, fn: Function): Function {
    if (!FUNCTIONS[arity]) {
        if (typeof arity !== 'number') {
            throw new TypeError('Expected arity to be a number, got ' + arity);
        }

        const params: string[] = [];

        for (let i = 0; i < arity; i++) {
            params.push('_' + i);
        }

        FUNCTIONS[arity] = new Function(
            'fn',
            `return function arity${arity} (${params.join(', ')}) { return fn.apply(this, arguments); }`
        ) as (fn: Function) => Function;
    }

    return FUNCTIONS[arity](fn);
}

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
    let result: Function = targetFn;

    transferProperties(sourceFn, targetFn);

    if (targetFn.length !== sourceFn.length) {
        result = setArity(sourceFn.length, targetFn);
        transferProperties(sourceFn, result);
    }


    safeDefine(result, 'toString', {
            configurable: true,
            writable: false,
            enumerable: false,
            value: function toString() {
                return String(sourceFn);
            }
        });

    if (options.name) {
        safeDefine(result, 'name', {
            configurable: true,
            writable: false,
            enumerable: false,
            value: options.name
        });
    }

    return result as K;
}