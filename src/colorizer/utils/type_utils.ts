/**
 * Gets the type value of a Record<key, value> type.
 * Typescript wizardry by @frasercl
 *
 * @example:
 * ```
 * type MyRecord = Record<string, number>;
 * type MyRecordValue = RecordValue<MyRecord>; // number
 * ```
 */
export type RecordValue<T extends Record<any, any>> = T extends Record<any, infer U> ? U : never;

/**
 * Remaps types that are compound types so the keys are exposed at a top-level.
 * This is primarily useful for use with Intellisense and other type-aware tools.
 * https://dev.to/kirkcodes/revealing-compound-types-in-typescript-2ic8
 */
export type Spread<Type> = { [Key in keyof Type]: Type[Key] };
