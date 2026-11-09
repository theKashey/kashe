import {kashe} from '../src/index.ts';

describe('a memoized function keeps the shape of the original', () => {
    it.each([
        [0, () => ({})],
        [1, (_a: object) => ({})],
        [3, (_a: object, _b: object, _c: object) => ({})],
    ])('keeps a length of %i', (length, fn) => {
        expect(kashe(fn as any).length).toBe(length);
    });

    it('never generates code', () => {
        const generate = jest.spyOn(global, 'Function');

        kashe((_a: object, _b: object) => ({}));

        expect(generate).not.toHaveBeenCalled();
        generate.mockRestore();
    });
});
