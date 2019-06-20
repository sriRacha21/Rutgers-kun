import { Constructor } from '../Types';
/** @private */
export interface CacheEntry<T = any> {
    value: T;
    expires: number;
}
/** @private */
export declare function createCacheKey(propName: string, params: any[], prefix?: boolean): string;
/** @private */
export declare function Cacheable<T extends Constructor>(cls: T): {
    new (...args: any[]): {
        cache: Map<string, CacheEntry<any>>;
        getFromCache(cacheKey: string): {} | undefined;
        setCache(cacheKey: string, value: {}, timeInSeconds: number): void;
        removeFromCache(cacheKey: string | string[], prefix?: boolean | undefined): void;
        _cleanCache(): void;
    };
} & T;
/** @private */
export declare function Cached(timeInSeconds?: number, cacheFailures?: boolean): (target: any, propName: string, descriptor: PropertyDescriptor) => PropertyDescriptor;
/** @private */
export declare function CachedGetter(timeInSeconds?: number): (target: any, propName: string, descriptor: PropertyDescriptor) => PropertyDescriptor;
/** @private */
export declare function ClearsCache<T>(cacheName: keyof T, numberOfArguments?: number): (target: any, propName: string, descriptor: PropertyDescriptor) => PropertyDescriptor;
