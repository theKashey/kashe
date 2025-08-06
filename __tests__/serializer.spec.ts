import {kashe} from "../src";

describe('kashe serializer', () => {
    it('uses serializer to emulate TTL', () => {
        let count = 100;
        let generation = 1;

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const fn = kashe((_x) => count++, {
            serializer: {
                writeTo(input) {
                    return {input, generation};
                },
                readFrom(from) {
                    if (from.generation !== generation) {
                        return undefined
                    }

                    return from.input;
                }
            }
        });

        const key = {};
        expect(fn(key)).toBe(100);
        expect(fn(key)).toBe(100);
        generation++;
        expect(fn(key)).toBe(101);
        expect(fn(key)).toBe(101);
    })
})