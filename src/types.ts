export interface WeakResult {
  value: any;
  // index: number;
}

export interface WeakStorage {
  get(args: any[]): WeakResult | undefined;

  set(args: any[], value: any): any;
}

export interface WeakMappable<T = any> {
  get(key: any): T | undefined;

  set(set: any, value: T): void;
}