import { withTestSelection } from '@variance-authority/sense/jest';

export default withTestSelection(
  {
    transform: { '^.+\\.tsx?$': ['ts-jest', {}] },
    // tsconfig rewrites `./file.ts` to `./file.js`, which jest cannot resolve
    moduleNameMapper: { '^(\\.{1,2}/.*)\\.js$': '$1' },
  },
  { suite: 'unit', preconditions: ['jest.config.mjs'] },
);
