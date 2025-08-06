import {kashe, withIsolatedKashe} from "../src";

describe('kashe scope', () => {
    it('uses scope to control cache', () => {
        let count = 0;
        const fn = kashe(
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            (_x) => count++,
        );
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const globalFn = kashe((_x) => count++, {scope:'GLOBAL'});

        const key = {};

        expect(fn(key)).toBe(0);
        expect(globalFn(key)).toBe(1);

        withIsolatedKashe(() => {
            expect(fn(key)).toBe(2);
            expect(globalFn(key)).toBe(1);
        });

        withIsolatedKashe(() => {
            expect(fn(key)).toBe(0);
            expect(globalFn(key)).toBe(3);
        }, 'GLOBAL');

        expect(fn(key)).toBe(0);
        expect(globalFn(key)).toBe(1);
    })
})