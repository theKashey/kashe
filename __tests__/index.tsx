import {kashe, weakKashe, boxed, inboxed, fork} from "../src/weak";

describe('Weak', () => {
    it('weak memoize', () => {
        let recomputations = 0;
        const produce = (state: any, a: any, b: any) => {
            recomputations++;
            return {a: a + state.a, b: b + state.b}
        };

        const state1 = {a: 1, b: 2};
        const state2 = {a: 1, b: 2};

        // base assertions

        expect(produce(state1, 1, 2)).toEqual({a: 2, b: 4});
        expect(recomputations).toBe(1);
        expect(produce(state2, 1, 2)).toEqual({a: 2, b: 4});
        expect(recomputations).toBe(2);


        const weakProduce = kashe(produce);
        const weakResult1 = weakProduce(state1, 1, 2);

        expect(weakResult1).toEqual({a: 2, b: 4});
        expect(recomputations).toBe(3);
        expect(weakResult1).toBe(weakProduce(state1, 1, 2));
        expect(recomputations).toBe(3);

        const weakResult1_2 = weakProduce(state1, 2, 2);
        expect(recomputations).toBe(4);
        expect(weakResult1_2).toEqual({a: 3, b: 4});
        const weakResult2 = weakProduce(state2, 1, 2);

        expect(weakResult2).toBe(weakProduce(state2, 1, 2));
        expect(weakResult1_2).toBe(weakProduce(state1, 2, 2));
    });

    it('weak kashe', () => {
        const kasheMap = kashe((data: any[], iterator: (x: number) => number) => data.map(i => iterator(i)));
        const weakMap = weakKashe((data: any[], iterator: (x: number) => number) => data.map(i => iterator(i)));

        const map = (x: number) => x + 1;
        const data = [0, 1];

        expect(kasheMap(data, map)).toBe(kasheMap(data, map));
        expect(weakMap(data, map)).toBe(weakMap(data, map));

        expect(kasheMap(data, x => x + 1)).not.toBe(kasheMap(data, x => x + 1));
        expect(weakMap(data, x => x + 1)).toBe(weakMap(data, x => x + 1));
        // @ts-ignore
        expect(weakMap(data, x => x + 1, 1)).toBe(weakMap(data, x => x + 1, 1));
        // @ts-ignore
        expect(weakMap(data, x => x + 1, 1)).not.toBe(weakMap(data, x => x + 1, 2));
        //
        expect(weakMap(data, x => x + 1)).toEqual([1, 2]);
    });

    it('this memoization', () => {
        const test = kashe(function (x: number) { return {x:x+this.x}});
        const this1 = {x:1};
        const this2 = {x:2};
        const this3 = {};
        const test1_1 = test.call(this1, 1);
        const test2_1 = test.call(this2, 1);
        const test1_2 = test.call(this1, 1);

        expect(test1_1).toBe(test1_2);
        expect(test1_1).not.toBe(test2_1);
        expect(test1_1.x).toBe(2);
        expect(test2_1.x).toBe(3);
    });

    it('cascade memoization', () => {
        const test = kashe((x: any, y: any, z: any) => ({x, y, z}));
        const arg1 = {arg1:1};
        const arg3_1 = {arg3_1:1};
        const arg3_2 = {arg3_2:1};
        {
            const result1 = test(arg1, 1, arg3_1);
            const result2 = test(arg1, 2, arg3_1);
            // arg2 stored in v3 position
            expect(result1).toBe(test(arg1, 1, arg3_1));
            expect(result2).toBe(test(arg1, 2, arg3_1));
        }
        {
            const result1 = test(arg1, arg3_1, 1);
            const result2 = test(arg1, arg3_2, 2);
            // result is saved in save v3 position
            expect(result1).toBe(test(arg1, arg3_1, 1));
            expect(result2).toBe(test(arg1, arg3_2, 2));
        }
        {
            const result1 = test(arg1, 1, arg3_1);
            const result2 = test(arg1, 2, arg3_2);
            // arg3 bypassed cache
            expect(result1).toBe(test(arg1, 1, arg3_1));
            expect(result2).toBe(test(arg1, 2, arg3_2));
        }
    });
})

describe('nested memoization', () => {
    const data1 = {data: 1};
    const data2 = {data: 2};
    const state1 = {state: 1};
    const state2 = {state: 2};

    const produce = (a: any) => ({a});
    const fn1 = kashe(produce);

    it('smoke check', () => {
        const r1 = fn1(data1);
        fn1(data2);
        expect(r1).toBe(fn1(data1));
    });

    const boxedFn = boxed(fn1);

    it('boxed check', () => {
        const r1 = boxedFn(state1, data1);
        const r2 = boxedFn(state2, data1);
        const r3 = boxedFn(state1, data2);

        expect(r1).toBe(r2);
        expect(r3).toBe(boxedFn(state1, data2));
        expect(r1).toBe(boxedFn(state1, data1));
        expect(r1).toBe(boxedFn(state2, data1));
    });

    const inboxedFn = inboxed(fn1);

    it('inboxed check', () => {
        const r1 = inboxedFn(state1, data1);
        const m1 = inboxedFn(state1, data1);
        expect(r1).toBe(m1);

        const r2 = inboxedFn(state2, data1);
        const r3 = inboxedFn(state1, data2);
        const m3 = inboxedFn(state1, data2);
        const z1 = inboxedFn(state1, data1);

        expect(r1).not.toBe(r2);
        expect(r1).not.toBe(r3);
        expect(r3).toBe(m3);
        expect(r1).toBe(z1);
    });

    it('inboxed nested', () => {
        let cnt = 0;
        const fn1 = () => cnt++;
        const fn2 = () => cnt++;
        const kfn1 = kashe(fn1);
        const kfn2 = kashe(fn2);

        const obj = {};

        const v1 = kfn1(obj);
        const v2 = kfn2(obj);

        expect(v1).toBe(kfn1(obj));
        expect(v2).toBe(kfn2(obj));
        expect(v1).not.toBe(v2);

        const ifn = inboxed((st) => [kfn1(st), kfn2(st)]);

        expect(ifn(obj, obj)).toEqual([2, 3]);
        expect(ifn(obj, obj)).toEqual([2, 3]);
    });
    const forkedFn1 = fork(fn1);
    const forkedFn2 = fork(fn1);

    it('fork check', () => {
        const r1 = forkedFn1(data1);
        const m1 = forkedFn1(data1);
        expect(r1).toBe(m1);

        const r2 = forkedFn2(data1);
        const r3 = forkedFn1(data2);
        const m3 = forkedFn1(data2);
        const z1 = forkedFn1(data1);

        expect(r1).not.toBe(r2);
        expect(r1).not.toBe(r3);
        expect(r3).toBe(m3);
        expect(r1).toBe(z1);
    });

});