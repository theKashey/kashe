<div align="center">
  <h1>kashe 🔥</h1>
  <br/>
  It's like <b>cache</b>, but with forget-me-bomb... remember it? No?
  <br/>
    <a href="https://www.npmjs.com/package/kashe">
      <img src="https://img.shields.io/npm/v/kashe.svg?style=flat-square" />
    </a>
    <a href="https://travis-ci.org/theKashey/kashe">
       <img alt="Travis" src="https://img.shields.io/travis/theKashey/kashe/master.svg?style=flat-square">
    </a>
</div>

A WeakMap based memoization library for a better and safer caching

## Memoization
Memoization is cool technique. But is it reliable and _safe_?

What is the difference between `lodash.memoize`, `memoize-one`, and `React.useMemo`?

- [lodash.memoize](https://lodash.com/docs/4.17.11#memoize) is a cool thing. But but default it has endless cache size.
- [memoize-one only](https://github.com/alexreardon/memoize-one) remembers the latest arguments and result. No need to worry about __cache busting__ mechanisms such as maxAge, maxSize, exclusions and so on which can be prone to __memory leaks__.
- [react.useMemo](https://reactjs.org/docs/hooks-reference.html#usememo) is the greatest of all. Still memoize only __one__ call, but doing it on per-component level.
The downside of `useMemo` is React. You cannot use it outside of Functional Component.

What about `reselect`, a tool powering up all the `redux` ecosystem? Still - __single cache item__. 

- __Is it server-side friendly?__ Nope, server handles many requests from many clients, and memoized value is constantly got wiped.
- __Is it server-side _safe_?__ Oh no! Cross request memoization could be a killer! What if memoized value not got rejected??
- __Is it test friendly?__ Nope, tests should always work the same, while memoization will make it... less predictable.

So - it's time to fix all the problems above. Wanna know more - [read the article](https://dev.to/thekashey/memoization-forget-me-bomb-34kh)

> In short - to better REMEMBER something, you have to better FORGET it

# API
- kashe/weaKashe - memoization
- box - prefixed memoization
- inbox - nested prefixed memoization
- fork - nested memoization

> TLDR: `kashe` uses passed arguments as a key to an internal WeakMap to store a result. It does not store anything anywhere - 
it's always _weak_. __Once argument is gone - data is gone__.

### kashe
- `kashe(function: T):T` - transparent weak memoization. Requires first argument to be an object or array or function. The
first argument would be used to store a result.
```js
import {kashe} from 'kashe';

const selector = state => [state.a, state.b];
const memoizedSelector = kashe(selector);
memoizedSelector(state) === memoizedSelector(state);

const complexSelector = (state, field) => ({ field: state[field]});
const memoizedComplexSelector = kashe(complexSelector);
memoizedComplexSelector(state, 'a') === memoizedComplexSelector(state, 'a');
```
### weakKashe
For the cases like selectors and mappers some times it's easier to use __not strict__ cache.
```js
const {weakKashe} from 'kashe';

const weakMap = weakKashe((data, iterator, ...deps) => data.map(iterator)); 

const derived = weakMap(data, line => ({...line, somethingElse}), localVariable1);
```
In this case:
- cache would be stored in the `data`
- arguments would be matched not by "strict" equality, but by the "toString" equality.
- as a result, the second `kashe` argument, always the new function, would not _destroy_ cache
- keep in mind - this is not 100% safe operation. Consider adding _local scope_ variables to control cache precision. 

### boxed
- `boxed(function(...args)=>T):(_, ...args)=>T` - "prefixes" a call to function with "weakmappable" argument. __All arguments__ shall be equal to return a cached result.
Use `boxed` to make any function kashe-memoizable, but adding a leading argument. 
```js
import {boxed} from 'kashe';

const addTwo = (a,b) => a+b; // could not be "kashe" memoized
const bAddTwo = boxed(addTwo);
const cacheKey = {}; // any object

bAddTwo(cacheKey, 1, 2) === bAddTwo(cacheKey, 1, 2) === 3
bAddTwo(otherCacheKey, 1, 2) // -> a new call

bAddTwo(cacheKey, 10, 20) // -> a new call - arguments dont match
bAddTwo(cacheKey, 1, 2) // -> a new call - original result replaced by 10+20
```

### inboxed
- `inboxed(function(...args)=>T):(_, ...args)=>T` - "nest" a call to a function with "weakmappable" argument.
Use `inboxed` to make any function kashe-memoizable, but adding a leading argument. 

> Diffence from `boxed` - `inboxed` "nests" all the cache below it. 
```js
import {inboxed} from 'kashe';

const selector = (state) => ({state}) // could be "kashe"-memoized
const memoizedSelector = kashe(selector);

const bSelector = boxed(memoizedSelector);
const ibSelector = inboxed(memoizedSelector);
const cacheKey = {}; // any object

ibSelector(cacheKey, state) === ibSelector(cacheKey, state)
ibSelector(otherCacheKey, state) // a new call. Other key used for inbox, and other cache would be used for memoizedSelector  
ibSelector(cacheKey, otherState) // a new call
ibSelector(cacheKey, state) // cacheKey has cache for `state`

// but!
bSelector(cacheKey, state) === bSelector(otherCacheKey, state)

// bSelector is not "sharing" it's own result (key is different), but underlaying
// `memoizedSelector` shares, and `state` argument is the same.
```

#### The difference between inboxed and boxed
- `boxed` could __increase__ probability to cache a value
- `inboxed` could __decrease__ probability to cache a value

`inboxed` is scoping all the _nested_ caches _behind_ a first argument. It if changes - cache changes.
> Yet again - first argument is WHERE cache is stored.

`boxed` is just storing result in a first argument. If cache is not found it is still possible to discover
it in a nested cache.

```js
const memoizedSelector = kashe(selector);

const inboxedSelector = inboxed(memoizedSelector);
const boxedSelector = boxed(memoizedSelector);

// state1 !== state2. selectors would use different caches, memoizedSelector included
inboxedSelector(state1, data) !== inboxedSelector(state2, data)

// state1 !== state2. memoization would fail, but memoizedSelector would return the same values
  boxedSelector(state1, data) ===   boxedSelector(state2, data)
```

`inboxedSelector` is more memory safe, but CPU intensive. It guratines all selectors would be _clean_ for a session(first argument).
`boxedSelector` is useful as long as everything here is still holds only ONE result. It may be wiped from nested selector, but still exists in a boxed
```js
memoizedSelector(data1);
boxedSelector(state, data1); // they are the same
boxedSelector(state, data2); // updating cache for both selectors
memoizedSelector(data2); // they are the same
memoizedSelector(data1); // cache is updated
boxedSelector(state, data2); // !!!! result is still stored in `state`
```

### fork
- `fork(function: T):T` - create a copy of a selector, with overiden internal cache.
`fork` has the same effect `inbox` has, but not adding a leading argument. First argument still expected to be an object, array, or a function.
```js
const selector = (state) => ({state});

const memoized = kashe(selector);
memoized(state) === memoized(state);

const forked = fork(memoized);
memoized(state) !== memoized(state);
```

#### Size
1.01 kb

# Cook-book

## Per-instance one argument memoization
Let's imagine a simple HOC
```js
const hoc = WrappedComponent => <SomeStuff><WrappedComponent/></SomeStuff>;
```
You want to call this function 10 times, and always get the same result
```js
hoc(ComponentA);
hoc(ComponentA); // !!! a new call === a new result, a new component, so remount! We dont need it.

const memoizedHoc = memoizeOne(hoc);

memoizedHoc(ComponentA);
memoizedHoc(ComponentA); // YES! It works as expected!
memoizedHoc(ComponentB); // BAM! Previous result got wiped
memoizedHoc(ComponentA); // A new result, and BAM! Previous result got wiped 

const kasheHoc = kashe(hoc);

kasheHoc(ComponentA);
kasheHoc(ComponentA); // YES! It works as expected!
kasheHoc(ComponentB); // YES! It works as expected! Result is stored in a first argument.
kasheHoc(ComponentA); // YES! It works as expected! Result is still inside ComponentA 
```
But what about concurrent execution, where _scope_ may matter, and where you dont want to leave any traces?
```js
// first client
kasheHoc(ComponentA);
// second client
kasheHoc(ComponentA); // We got cached result :(

// lets fix, and "prefix" selector
// using `box` for memoized `kasheHoc` would nullify the effect.

const boxedKasheHoc = inbox(kasheHoc);
// first client
boxedKasheHoc(client1Key, ComponentA);
// second client
boxedKasheHoc(client2Key, ComponentA); // another client key - another memoization! 
boxedKasheHoc(client2Key, ComponentB); // another argument key - another memoization!
boxedKasheHoc(client2Key, ComponentA); // result is cached
```

# Reselect API
A `Reselect`-compatible API
> TLDR: it just replaces default memoization for reselect - `createSelectorCreator(strongMemoize);`. `strongMemoize` - 
is not public API yet. 

Reselect is a great library, but it has one limitation - stores only one result. There are a few attempts
to "fix" it
  - [re-reselect](https://github.com/toomuchdesign/re-reselect), to let you store result in a "buckets". All that data would be kept in a memory.
  - [memoize-state](https://github.com/theKashey/memoize-state), to use only data pieces, which matters. Still no problem to _miss a cache_.
  - constructing selectors in [mapStateToProps factory function](https://react-redux.js.org/api/connect#factory-functions), to create per-instance memoization.
   That requires a different code structure.
   
Magically - `kashe` is ideally compatible with `reselect` API      
```js
import {createSelector} from 'kashe/reselect'

const getDataSlice = (state, props) => state[props.sliceId]
const dataSelector = createSelector(getDataSlice, slice => ({slice})) // lets make it harder

const slice1Value = dataSelector(state, { sliceId: 1 });
const slice2Value = dataSelector(state, { sliceId: 2 });
// the real `reselect` would replace stored value by a new one

const unknownValue = dataSelector(state, { sliceId: 1 });
// the real `reselect` would return a new object here


// `kashe/reselect` - would return `slice1Value`
```

## Troubleshoting
#### solving `Error: No weak-mappable object found to read a cache from.`
If all selectors returned a non "weak-mappable" object (like array, object, function, symbol) - kashe would throw.
This is intentional, as long as it stores cache inside such objects, and without them it could not work.
However, if you think that it should work that way - just give it that "cache"
```js
const cache = {};
const selector = createSelector(
  someSelector, 
  () => cache,  // <---- cache for a selector
  selectedData => {/*...*/}
);
```

# Memoize-one
`kashe` could not replace `memoize-one` as long as it requires at least one argument to be a object or array.
But if at least one is in list - go for it.

# React.useMemo
You may use React.useRef/useState/Context to create and propagate a per-instance, or per-tree variable, you may use
for `kashe`

```js
const KasheContext = React.createContext();
// create a "value provider". useRef would give you an object you may use
const CacheKeyProvider = ({children}) => (
  <KasheContext.Provider value={useRef(null)}>{children}</KasheContext.Provider>
);

const memoizedFunction = kashe(aFunction);

const OtherComponent = () => {
  const kasheKey = useContext(KasheContext);
  const localKasheKey = useRef();
  // use per-render key to store data
  const memoizedData1 = memoizedFunction(kasheKey, firstArgument, secondArgument);
  // use per-instance key to store data
  const memoizedData2 = memoizedFunction(localKasheKey, firstArgument, secondArgument);
}
```
So - almost the same as `React.useMemo`, but you might use it in Class Components and `mapStateToProps`.

## Usage in class components
See [Don’t Stop the Data Flow in Rendering](https://overreacted.io/writing-resilient-components/#dont-stop-the-data-flow-in-rendering)
for details about memoization in react.
```js

// wrap slowlyCalculateTextColor with leading "state" argument 
const generateTextColor = boxed(slowlyCalculateTextColor);

class MyComponent extends React.Component {
  // ...
  render () {
    // use `this` as `state`
    const textColor = generateTextColor(this, this.props.color);
    return (
        <button className={'Button-' + color + ' Button-text-' + textColor}>
          {children}
        </button>
    );
  }
}
```

## mapStateToProps
```js
const mapStateToProps = () => {
  const selector1 = fork(selectors.selector1);
  return state => ({
    value1: selector1(state), // "per-instance" selector
    value2: selectors.selector2(box, state), // normal selector
    value3: memoizedFunction(selector1, state.data), // use "selector1" as a cache-key for another function
  })
};
```

# See also
The nearest analog of `kashe` is [weak-memoize](https://github.com/emotion-js/emotion/tree/master/packages/weak-memoize), but it does accept only one argument.

# Speed
```html
// a simple one argument function
memoize-one one argument  x 58,277,071 ops/sec ±1.60% (87 runs sampled)
kashe       one argument  x 19,724,367 ops/sec ±0.76% (91 runs sampled)

// a simple two arguments function
memoize-one two arguments x 42,526,871 ops/sec ±0.77% (90 runs sampled)
kashe       two arguments x 16,929,449 ops/sec ±0.84% (89 runs sampled)

// using more than one object to call - memoize-one is failing, while kashe still works
// PS: multiply results by 2 
memoize-one    two states x   308,917 ops/sec ±0.56% (92 runs sampled)
kashe          two states x 8,992,170 ops/sec ±0.96% (83 runs sampled)
```

# Kashe-y?
When I first time I heard my nickname - `kashey` pronounces as `cache` - I decides to create a caching library one day. Here we go.

# License
MIT

