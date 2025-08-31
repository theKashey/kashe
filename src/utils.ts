export const isWeakable = (value: any): boolean => (
  value && (typeof value === 'object')
  || typeof value === 'function'
);

export const Stringify = (value: unknown): string => {
    if (typeof value==='string'){
        return value;
    }

    if (typeof value==='function'){
        return String(value);
    }

    // let it throw, do not swallow error
    return JSON.stringify(value);
}