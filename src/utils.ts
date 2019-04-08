export const isWeakable = (value: any): boolean => (
  value && (typeof value === 'object')
  // || typeof value === 'function' // not using function to prevent leaks
);