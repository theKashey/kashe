import {createSelector as rCS, createSelectorCreator, createStructuredSelector} from 'reselect';

import {strongMemoize} from "./weak";

export const createSelector: typeof rCS = createSelectorCreator(strongMemoize as any);

export {
  createStructuredSelector,
  createSelectorCreator
}