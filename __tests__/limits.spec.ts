import {kashe} from "../src";

describe('kashe serializer', () => {
    it('uses serializer to emulate TTL', () => {
        let count = 0;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
    })
})