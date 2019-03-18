import { createSelectorCreator, createStructuredSelector } from 'reselect';
import { strongMemoize } from "./weak";
export var createSelector = createSelectorCreator(strongMemoize);
export { createStructuredSelector, createSelectorCreator };
