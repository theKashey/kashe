export interface WeakResult {
  value: any;
  index: number;
}

export interface WeakStorage {
  get(args: any[]): WeakResult | undefined;

  set(args: any[], value: any): any;
}

export interface WeakMappable {
  get(key: any): any | undefined;

  set(set: any, value: any): void;
}