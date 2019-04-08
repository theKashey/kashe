import {createSelector as rCS, createSelectorCreator, createStructuredSelector} from 'reselect';
import {weakMemoizeCreator} from './weak';
import {createStrongStorage} from './strongStorage';

export const strongMemoize = weakMemoizeCreator(createStrongStorage);

export const createSelector: typeof rCS = createSelectorCreator(strongMemoize as any);

export {
  createStructuredSelector,
  createSelectorCreator
}