/** @private */
export declare type ObjMap<Obj, T> = {
    [name in Extract<keyof Obj, string>]: T;
};
/** @private */
export declare type ObjMapPart<Obj, T> = Partial<ObjMap<Obj, T>>;
/** @private */
export declare type KeyMapper<T> = (value: T) => string;
/** @private */
export declare function mapObject<T, O, Obj = Record<string, T>>(obj: Obj, fn: (value: T, key: Extract<keyof Obj, string>) => O): ObjMap<Obj, O>;
/** @private */
export declare function objectFromArray<T, O, Obj>(arr: T[], fn: (value: T) => ObjMapPart<Obj, O>): ObjMap<Obj, O>;
/** @private */
export declare function indexBy<T>(arr: T[], key: Extract<keyof T, string>): Record<string, T>;
/** @private */
export declare function indexBy<T>(arr: T[], keyFn: KeyMapper<T>): Record<string, T>;
/** @private */
export declare function forEachObjectEntry<T, Obj>(obj: Obj, fn: (value: T, key: Extract<keyof Obj, string>) => void): void;
/** @private */
export declare function entriesToObject<T>(obj: Array<[string, T]>): Record<string, T>;
