import {createSelector} from "../src/reselect";
import {fork} from '../src/index';

describe('Reselect wrapper', () => {
  it('createSelector smoke', () => {
    const pickState = (state: any) => state.a;
    const selector = createSelector(pickState, a => [a[1]]);

    const X = [0, 1];
    const X2 = [0, 1];
    expect(selector({a: [0, 1]})).toEqual([1]);
    expect(selector.recomputations()).toBe(1);

    const s1 = selector({a: X});
    const s2 = selector({a: X});

    expect(s1).toBe(s2);
    expect(selector.recomputations()).toBe(2);

    expect(selector({a: X})).not.toBe(selector({a: X2}));
    expect(selector.recomputations()).toBe(3);

    // they are memoized
    expect(selector({a: X})).toEqual(selector({a: X2}));
    expect(selector.recomputations()).toBe(3);
  });

  it('createSelector multi argument', () => {
    const cache = {};
    const pickState = (state: any, pick: any = 'not-set') => state[pick] || "undefined";
    const selector: any = createSelector(pickState, () => cache, a => [a]);

    const state = {a: 1};
    expect(selector(state)).toEqual(["undefined"]);
    expect(selector(state, 'a')).toEqual([1]);

  });

  it('fork selectors', () => {
    const pickState = (state: any) => state.a;
    const selector = createSelector(pickState, a => [a[1]]);
    const forkedSelector = fork(selector);

    const X = [0, 1];

    const s1 = selector({a: X});
    const s2 = forkedSelector({a: X});

    expect(s1).not.toBe(s2);
    expect(s1).toEqual(s2);
  });
});
