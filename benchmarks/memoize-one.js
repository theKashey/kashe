/* eslint-disable flowtype/require-valid-file-annotation */
const memoizeOne = require('memoize-one');
const Benchmark = require('benchmark');
const {kashe} = require('../');

const suite = new Benchmark.Suite();

const fn1 = (state) => state.map(state => state.x).reduce((acc, i) => acc + i, 0);
const fn2 = (state, y) => state.map(state => state.x).reduce((acc, i) => acc + i + y, 0);

const memoF1 = memoizeOne(fn1);
const kF1 = kashe(fn1);

const memoF2 = memoizeOne(fn2);
const kF2 = kashe(fn2);

const state = Array(100).fill(1).map((x, index) => ({x: index}));
const state2 = [...state];

suite.add('memoize-one one argument', () => {
  memoF1(state);
});

suite.add('kashe one argument', () => {
  kF1(state);
});

suite.add('memoize-one two argument', () => {
  memoF2(state, 10);
});

suite.add('kashe two argument', () => {
  kF2(state, 10);
});

suite.add('memoize-one two states', () => {
  memoF1(state);
  memoF1(state2);
});

suite.add('kashe two states', () => {
  kF1(state);
  kF1(state2);
});


suite.on('cycle', e => console.log(String(e.target)));

suite.run({async: true});
