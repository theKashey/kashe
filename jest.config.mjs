import { withTestSelection } from '@variance-authority/sense/jest';

export default withTestSelection(
  {
    transform: { '^.+\\.tsx?$': ['ts-jest', {}] },
  },
  { preconditions: ['jest.config.mjs'] },
);
