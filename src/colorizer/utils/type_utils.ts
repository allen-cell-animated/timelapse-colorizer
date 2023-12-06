/**
 * Gets the type value of a Record<key, value> type.
 * Typescript wizardry by @frasercl
 *
 * @example:
 * ```
 * type MyRecord = Record<string, number>;
 * type MyRecordValue = GetRecordValue<MyRecord>; // number
 * ```
 */
export type GetRecordValue<T> = T extends Record<string, infer U> ? U : never;
