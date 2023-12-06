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
export type RecordValue<T extends Record<any, any>> = T extends Record<string, infer U> ? U : never;
