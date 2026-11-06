import {kashe} from "../src/index.ts";

describe('kashe limit', () => {
    it('drops the least recently used record, from the first read on', () => {
        let count = 0;
         
        const fn = kashe((_x,_index) => count++, {
            limit:2
        });

        const key = {};
        expect(fn(key, 1)).toBe(0);

        expect(fn(key, 2)).toBe(1);
        expect(fn(key, 1)).toBe(0); // not reset

        expect(fn(key, 3)).toBe(2); // 2 is the least recently used
        expect(fn(key, 1)).toBe(0); // not reset
        expect(fn(key, 2)).toBe(3); // reset, drops 3
        expect(fn(key, 1)).toBe(0); // not reset

        expect(fn(key, 4)).toBe(4); // drops 2
        expect(fn(key, 1)).toBe(0); // not reset
        expect(fn(key, 2)).toBe(5); // reset, drops 4
    })
})