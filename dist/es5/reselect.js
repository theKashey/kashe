"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var reselect_1 = require("reselect");
exports.createSelectorCreator = reselect_1.createSelectorCreator;
exports.createStructuredSelector = reselect_1.createStructuredSelector;
var weak_1 = require("./weak");
exports.createSelector = reselect_1.createSelectorCreator(weak_1.strongMemoize);
