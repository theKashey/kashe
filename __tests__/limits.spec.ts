import {kashe} from "../src/index.ts";

describe('kashe serializer', () => {
    it('uses serializer to emulate TTL', () => {
        let count = 0;
         
        const fn = kashe((_x,_index) => count++, {
            limit:2
        });

        const key = {};
        expect(fn(key, 1)).toBe(0);

        expect(fn(key, 2)).toBe(1);
        expect(fn(key, 1)).toBe(0); // not reset

        expect(fn(key, 3)).toBe(2);
        expect(fn(key, 1)).toBe(3); // reset
        expect(fn(key, 3)).toBe(2); // not reset
        expect(fn(key, 3)).toBe(2); // not reset

        expect(fn(key, 4)).toBe(4);
        expect(fn(key, 3)).toBe(2);// no reset
        expect(fn(key, 1)).toBe(5);// LRU resetexpect(fn(key, 2)).toBe(5);// LRU reset
    })
})