import {kashe, resetKashe} from "../src/index.ts";

describe('kashe cleanup', () => {
    it('uses serializer to emulate TTL', () => {
        let count = 0;

        const fn = kashe((_x,_index) => count++);

        const key = {};
        expect(fn(key, 1)).toBe(0);
        expect(fn(key, 2)).toBe(1);

        resetKashe();

        expect(fn(key, 1)).toBe(2);
        expect(fn(key, 2)).toBe(3);
    })
})