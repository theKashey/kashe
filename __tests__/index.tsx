import {kashe, boxed, inboxed, fork} from "../src/weak";

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
});
