import {kashe} from '../src/index.ts'

let resolver:any = {};
const spy = jest.fn();

beforeEach(() => {
    // this "resets cache" between tests
    resolver = {};
    spy.mockClear();
});

const ReactCache: typeof kashe = (fn) => (
    kashe(fn, {
        resolver: () => resolver,
        UNSAFE_allowNoWeakKeys: true,
    })
);


const cachedCall = ReactCache(spy)

test('renders app with cache isolation:1', () => {
    cachedCall(1);
    cachedCall(1); // reuse
    cachedCall(2);
    expect(spy).toHaveBeenCalledTimes(2)
})

test('renders app with cache isolation:2', () => {
    cachedCall(1);
    cachedCall(1); // reuse
    cachedCall(2);
    expect(spy).toHaveBeenCalledTimes(2)
})