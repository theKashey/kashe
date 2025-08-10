import {kashe, withIsolatedKashe} from "../src/index.ts";

describe('kashe scope', () => {
    it('uses scope to control cache', () => {
        let count = 0;
        const fn = kashe(
             
            (_x) => count++,
        );
         
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
        }, {scope:'GLOBAL'});

        withIsolatedKashe(() => {
            expect(fn(key)).toBe(0);
            // restart
            expect(globalFn(key)).toBe(4);
        }, {scope:'GLOBAL'});

        const pointer= {};

        withIsolatedKashe(() => {
            expect(fn(key)).toBe(0);
            // restart
            expect(globalFn(key)).toBe(5);
        }, {scope:'GLOBAL', pointer});

        withIsolatedKashe(() => {
            expect(fn(key)).toBe(0);
            // reuse
            expect(globalFn(key)).toBe(5);
        }, {scope:'GLOBAL', pointer})



        expect(fn(key)).toBe(0);
        expect(globalFn(key)).toBe(1);
    })
})