import {weakKashe, resetKashe} from '../src/index.ts';

describe('weakKashe', () => {
    afterEach(() => {
        resetKashe();
    });

    test('should recognize identical inline functions by string representation', () => {
        const processor = weakKashe([1])((data: number[], fn: (x:number[])=>any) => fn(data));

        const data = [1, 2];
        expect(processor(data, (x) => ({result: x[0] * 2}))).toBe(processor(data, (x) => ({result: x[0] * 2})));
        expect(processor(data, (x) => ({result: x[0] * 2}))).not.toBe(processor(data, x=> ({result: x[1] * 2})));
        expect(processor(data, (x) => ({result: x[0] * 2})).result).toBe(2);
    });

    test('should recognize identical object string representations:arrays', () => {
        const processor = weakKashe([0])((data: number[], fn: (x:number[])=>any) => fn(data));

        const fn1 = (x: number[]) => ({result: x[0] * 2});
        const fn2 = (x: number[]) => ({result: x[0] * 2});
        expect(processor([1, 2], fn1)).toBe(processor([1, 2], fn1));
        expect(processor([1, 2], fn1)).not.toBe(processor([1, 2, 3], fn1));
        expect(processor([1, 2], fn1)).not.toBe(processor([1, 2], fn2));
    });

    test('should recognize identical object string representations:objects', () => {
        const processor = weakKashe([0])((data: {x:number}, fn: (x:{x:number})=>any) => fn(data));

        const fn1 = ({x}: {x:number}) => ({result: x * 2});
        const fn2 = ({x}: {x:number}) => ({result: x * 2});
        expect(processor({x:1}, fn1)).toBe(processor({x:1}, fn1));
        expect(processor({x:1}, fn1)).not.toBe(processor({x:2}, fn1));
        expect(processor({x:1}, fn1)).not.toBe(processor({x:1}, fn2));
    });
});
