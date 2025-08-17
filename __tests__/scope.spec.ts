import {kashe, withKasheIsolation} from "../src/index.ts";

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

        withKasheIsolation(() => {
            expect(fn(key)).toBe(2);
            expect(globalFn(key)).toBe(1);
        });

        withKasheIsolation(() => {
            expect(fn(key)).toBe(0);
            expect(globalFn(key)).toBe(3);
        }, {scope:'GLOBAL'});

        withKasheIsolation(() => {
            expect(fn(key)).toBe(0);
            // restart
            expect(globalFn(key)).toBe(4);
        }, {scope:'GLOBAL'});

        const pointer= {};

        withKasheIsolation(() => {
            expect(fn(key)).toBe(0);
            // restart
            expect(globalFn(key)).toBe(5);
        }, {scope:'GLOBAL', pointer});

        withKasheIsolation(() => {
            expect(fn(key)).toBe(0);
            // reuse
            expect(globalFn(key)).toBe(5);
        }, {scope:'GLOBAL', pointer})



        expect(fn(key)).toBe(0);
        expect(globalFn(key)).toBe(1);
    })
})