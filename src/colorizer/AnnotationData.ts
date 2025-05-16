import Papa from "papaparse";
import { Color } from "three";

import { removeUndefinedProperties } from "../state/utils/data_validation";
import { DEFAULT_CATEGORICAL_PALETTE_KEY, KNOWN_CATEGORICAL_PALETTES } from "./colors/categorical_palettes";
import { cloneLabel, getLabelTypeFromParsedCsv } from "./utils/data_utils";

import Dataset from "./Dataset";

export const CSV_COL_ID = "ID";
export const CSV_COL_TIME = "Frame";
export const CSV_COL_TRACK = "Track";

export const BOOLEAN_VALUE_TRUE = "true";
export const BOOLEAN_VALUE_FALSE = "false";

export const DEFAULT_ANNOTATION_LABEL_COLORS = KNOWN_CATEGORICAL_PALETTES.get(
  DEFAULT_CATEGORICAL_PALETTE_KEY
)!.colorStops;

export enum LabelType {
  BOOLEAN = "boolean",
  INTEGER = "integer",
  CUSTOM = "custom",
}

export enum AnnotationMergeMode {
  APPEND = "append",
  MERGE = "merge",
  OVERWRITE = "overwrite",
}

export type LabelOptions = {
  type: LabelType;
  name: string;
  color: Color;
  autoIncrement: boolean;
};

export type LabelData = {
  options: LabelOptions;
  ids: Set<number>;
  lastValue: string | null;

  // Bidirectional mapping between IDs and values.
  valueToIds: Map<string, Set<number>>;
  idToValue: Map<number, string>;

  // TODO: Store recently used values? Save values even if all IDs with them
  // have been removed?
};

export type AnnotationParseResult = {
  annotationData: AnnotationData;
  /**
   * The number of annotated objects that had times/frame numbers that did not
   * match those of the dataset. If > 0, this likely indicates that annotations
   * for a different dataset were imported.
   */
  mismatchedTimes: number;
  /**
   * The number of annotated objects that had times/frame numbers that did not
   * match those of the dataset. If > 0, this likely indicates that annotations
   * for a different dataset were imported.
   */
  mismatchedTracks: number;
  /**
   * Rows that could not be parsed due to invalid (non-numeric) IDs, tracks, or
   * times. These rows will be skipped.
   */
  unparseableRows: number;
  /**
   * The number of rows with IDs that were not found in the dataset and were
   * skipped. If > 0, this likely indicates that annotations for a different
   * dataset were imported, or that the dataset was modified.
   */
  invalidIds: number;
  totalRows: number;
};

export interface IAnnotationDataGetters {
  /**
   * Returns the array of label data objects.
   * @returns an array of `LabelData` objects, containing:
   * - `name`: The name of the label.
   * - `color`: The color of the label.
   * - `ids`: A set of object IDs that have the label applied.
   * Object properties SHOULD NOT be modified directly.
   */
  getLabels(): LabelData[];

  /**
   * Returns the indices of all labels that have been applied to the object id.
   * (Indices are ordered as returned by `getLabels()`.)
   * @param id The object ID to look up label indices for.
   * @returns an array of label indices. Empty if no labels have been applied to
   * the ID.
   */
  getLabelsAppliedToId(id: number): number[];

  /**
   * Returns whether the label has been applied to the object ID.
   * @param labelIdx The index of the label to look up.
   * @param id The object ID.
   * @returns `true` if the label has been applied to the object ID, `false`
   * otherwise.
   */
  isLabelOnId(labelIdx: number, id: number): boolean;

  /**
   * Returns all object IDs that the label has been applied to.
   * @param labelIdx The index of the label to look up object IDs for.
   * @returns an array of object IDs. Empty if the label has not been applied to
   * any object IDs.
   */
  getLabeledIds(labelIdx: number): number[];

  /**
   * Returns a time to label and ID map, in the format `{time: {labelId:
   * [objectIds]}}`.
   *
   * Each time (by frame number) maps to a record of labeled object IDs present
   * at that time. The record's keys are a label (by index), and the value is an
   * array of the objects (by ID) present for that time frame that have that
   * label applied. (If no objects have a label applied at a given time, it will
   * not be present in the record.)
   *
   * A dataset with a single frame and an object with ID 0, labeled with label
   * 0, would return `{0: {0: [0]}}`, in the format `{time: {labelId:
   * [objectIds]}}`.
   *
   * @param dataset The dataset to use for time information.
   * @returns a map from time to a record of label indices to IDs.
   * @example
   * ```typescript
   * // Let's say we have two labels (0 and 1). There are objects with IDs 11, 12,
   * // and 13 at time 234, and ID 14 and 15 at time 577.
   * // Label 0 has been applied to objects 11, 12, and 13.
   * // Label 1 has been applied to objects 13, 14, and 15.
   *
   * const timeToLabelMap = getTimeToLabelIdMap(some_dataset);
   * timeToLabelMap.get(234); // { 0: [11, 12, 13], 1: [13] }
   * timeToLabelMap.get(577); // { 1: [14, 15]}
   * ```
   * */
  getTimeToLabelIdMap(dataset: Dataset): Map<number, Record<number, number[]>>;

  /**
   * Returns the next default label settings, including name and color. Useful
   * for ensuring labels have unique names and colors, even if some have been
   * deleted.
   */
  getNextDefaultLabelSettings(): LabelOptions;

  getNextDefaultLabelValue(labelIdx: number, useLastValue: boolean): string;

  getValueFromId(labelIdx: number, id: number): string | null;

  /**
   * Converts the annotation data to a CSV string.
   *
   * @param dataset Dataset object to use for time and track information.
   * @param delimiter The delimiter to use between cells. Default is a comma
   * (",").
   * @returns Returns a comma-separated value (CSV) string representation of the
   * annotation data, including a header. The header will contain the columns:
   *   - ID (object ID)
   *   - Track (track ID)
   *   - Frame (time)
   *   - ...and one column for each label.
   *
   * Label names will be enclosed in double quotes, and special characters will
   * be escaped. Double quotes will be escaped with another double quote, and
   * special characters at the start of the label name that could be interpreted
   * as equations (`+`, `-`, `=`, `@`) will be escaped with a leading single
   * quote. Whitespace will be trimmed from the label names.
   *
   * Each object ID that has been labeled will be a row in the CSV. For label
   * columns, the cell value will be 1 if the label is applied to the object,
   * and 0 if it is not. Rows end with `\r\n` and cells are separated by commas
   * by default.
   */
  toCsv(dataset: Dataset, separator?: string): string;
}

export interface IAnnotationDataSetters {
  /**
   * Creates a new label with the given options and returns its index in the
   * array of labels (as returned by `getLabels()`).
   * */
  createNewLabel(options?: Partial<LabelOptions>): number;
  setLabelOptions(labelIdx: number, options: Partial<LabelOptions>): void;
  deleteLabel(labelIdx: number): void;
  setLabelValueOnIds(labelIdx: number, ids: number[], value: string): void;
  removeLabelOnIds(labelIdx: number, ids: number[]): void;
  clear(): void;
}

export type IAnnotationData = IAnnotationDataGetters & IAnnotationDataSetters;

export class AnnotationData implements IAnnotationData {
  private labelData: LabelData[];
  private numLabelsCreated: number;
  /**
   * Cached mapping from time to label indices to IDs. Must be invalidated when
   * labels are removed, or if annotations are applied to or removed from
   * objects.
   */
  private timeToLabelIdMap: Map<number, Record<number, number[]>> | null;

  constructor() {
    this.labelData = [];
    this.numLabelsCreated = 0;
    this.timeToLabelIdMap = null;

    this.getLabelsAppliedToId = this.getLabelsAppliedToId.bind(this);
    this.getLabeledIds = this.getLabeledIds.bind(this);
    this.getTimeToLabelIdMap = this.getTimeToLabelIdMap.bind(this);
    this.getLabels = this.getLabels.bind(this);
    this.getNextDefaultLabelSettings = this.getNextDefaultLabelSettings.bind(this);
    this.createNewLabel = this.createNewLabel.bind(this);
    this.deleteLabel = this.deleteLabel.bind(this);
    this.isLabelOnId = this.isLabelOnId.bind(this);
    this.setLabelOptions = this.setLabelOptions.bind(this);
    this.setLabelValueOnId = this.setLabelValueOnId.bind(this);
    this.setLabelValueOnIds = this.setLabelValueOnIds.bind(this);
    this.removeLabelOnId = this.removeLabelOnId.bind(this);
    this.removeLabelOnIds = this.removeLabelOnIds.bind(this);
    this.getNextDefaultLabelValue = this.getNextDefaultLabelValue.bind(this);
    this.getValueFromId = this.getValueFromId.bind(this);
    this.toCsv = this.toCsv.bind(this);
  }

  // Getters

  getLabels(): LabelData[] {
    return [...this.labelData];
  }

  isLabelOnId(labelIdx: number, id: number): boolean {
    this.validateIndex(labelIdx);
    return this.labelData[labelIdx].ids.has(id);
  }

  getLabelsAppliedToId(id: number): number[] {
    const labelIdxs: number[] = [];
    for (let i = 0; i < this.labelData.length; i++) {
      if (this.labelData[i].ids.has(id)) {
        labelIdxs.push(i);
      }
    }
    return labelIdxs;
  }

  getLabeledIds(labelIdx: number): number[] {
    this.validateIndex(labelIdx);
    return Array.from(this.labelData[labelIdx].ids);
  }

  getTimeToLabelIdMap(dataset: Dataset): Map<number, Record<number, number[]>> {
    if (this.timeToLabelIdMap !== null) {
      return this.timeToLabelIdMap;
    }

    const timeToLabelIdMap = new Map<number, Record<number, number[]>>();

    for (let labelIdx = 0; labelIdx < this.labelData.length; labelIdx++) {
      const ids = this.labelData[labelIdx].ids;
      for (const id of ids) {
        const time = dataset.times?.[id];
        if (time === undefined) {
          continue;
        }
        if (!timeToLabelIdMap.has(time)) {
          timeToLabelIdMap.set(time, {});
        }
        if (!timeToLabelIdMap.get(time)![labelIdx]) {
          timeToLabelIdMap.get(time)![labelIdx] = [];
        }
        timeToLabelIdMap.get(time)![labelIdx].push(id);
      }
    }
    this.timeToLabelIdMap = timeToLabelIdMap;
    return timeToLabelIdMap;
  }

  getIdsToLabels(): Map<number, number[]> {
    const idsToLabels = new Map<number, number[]>();
    for (let labelIdx = 0; labelIdx < this.labelData.length; labelIdx++) {
      for (const id of this.labelData[labelIdx].ids) {
        if (!idsToLabels.has(id)) {
          idsToLabels.set(id, []);
        }
        idsToLabels.get(id)!.push(labelIdx);
      }
    }
    return idsToLabels;
  }

  getValueFromId(labelIdx: number, id: number): string | null {
    // This lookup may be too slow. May need to cache lookup from ID to value.
    this.validateIndex(labelIdx);
    const labelData = this.labelData[labelIdx];
    if (labelData.ids.has(id)) {
      return labelData.idToValue.get(id) ?? null;
    } else {
      return null;
    }
  }

  getNextDefaultLabelSettings(): LabelOptions {
    const color = new Color(
      DEFAULT_ANNOTATION_LABEL_COLORS[this.numLabelsCreated % DEFAULT_ANNOTATION_LABEL_COLORS.length]
    );
    const name = `Label ${this.numLabelsCreated + 1}`;
    return { type: LabelType.BOOLEAN, name, color, autoIncrement: true };
  }

  getNextDefaultLabelValue(labelIdx: number, useLastValue: boolean): string {
    this.validateIndex(labelIdx);
    const labelData = this.labelData[labelIdx];
    switch (labelData.options.type) {
      case LabelType.BOOLEAN:
        return BOOLEAN_VALUE_TRUE;
      case LabelType.INTEGER:
        if (labelData.lastValue === null) {
          return "0";
        } else if (labelData.options.autoIncrement && !useLastValue) {
          const lastValueInt = parseInt(labelData.lastValue, 10);
          return (lastValueInt + 1).toString();
        } else {
          return labelData.lastValue.toString();
        }
      case LabelType.CUSTOM:
        if (!labelData.lastValue) {
          return "Click to edit";
        } else {
          return labelData.lastValue;
        }
    }
  }

  // Setters

  private markIdMapAsDirty(): void {
    this.timeToLabelIdMap = null;
  }

  /** Creates a new label and returns its index. */
  createNewLabel(options: Partial<LabelOptions> = {}): number {
    options = removeUndefinedProperties(options);
    this.labelData.push({
      options: { ...this.getNextDefaultLabelSettings(), ...options },
      ids: new Set(),
      idToValue: new Map<number, string>(),
      valueToIds: new Map<string, Set<number>>(),
      lastValue: null,
    });

    this.numLabelsCreated++;
    return this.labelData.length - 1;
  }

  private validateIndex(idx: number): void {
    if (idx < 0 || idx >= this.labelData.length) {
      throw new Error(`Invalid label index: ${idx}`);
    }
  }

  setLabelOptions(labelIdx: number, options: Partial<LabelOptions>): void {
    this.validateIndex(labelIdx);
    options = removeUndefinedProperties(options);
    const labelData = this.labelData[labelIdx];
    labelData.options = { ...labelData.options, ...options };
    this.markIdMapAsDirty();
  }

  deleteLabel(labelIdx: number): void {
    this.validateIndex(labelIdx);
    this.labelData.splice(labelIdx, 1);
    this.markIdMapAsDirty();
  }

  /**
   * Removes a single ID from the valueToIds map for a label. If the ID is the last
   * one in the set, the value is removed from the map as well.
   */
  private removeIdFromValue(labelIdx: number, id: number, value: string): void {
    const labelData = this.labelData[labelIdx];
    if (labelData.valueToIds.has(value)) {
      const ids = labelData.valueToIds.get(value)!;
      ids.delete(id);
      if (ids.size === 0) {
        labelData.valueToIds.delete(value);
      }
    }
    if (labelData.idToValue.has(id)) {
      labelData.idToValue.delete(id);
    }
    this.markIdMapAsDirty();
  }

  private setLabelValueOnId(labelIdx: number, id: number, value: string): void {
    this.validateIndex(labelIdx);

    const labelData = this.labelData[labelIdx];
    if (labelData.ids.has(id)) {
      // If this ID is already labeled, remove it from the old value to reassign
      // it.
      const oldValue = this.getValueFromId(labelIdx, id);
      if (oldValue !== null && oldValue !== value) {
        this.removeIdFromValue(labelIdx, id, oldValue);
      }
    }
    if (!labelData.valueToIds.has(value)) {
      labelData.valueToIds.set(value, new Set());
    }
    labelData.valueToIds.get(value)!.add(id);
    labelData.idToValue.set(id, value);

    labelData.ids.add(id);
    labelData.lastValue = value;
    this.markIdMapAsDirty();
  }

  setLabelValueOnIds(labelIdx: number, ids: number[], value: string): void {
    this.validateIndex(labelIdx);
    for (const id of ids) {
      this.setLabelValueOnId(labelIdx, id, value);
    }
    this.markIdMapAsDirty();
  }

  private removeLabelOnId(labelIdx: number, id: number): void {
    this.validateIndex(labelIdx);
    const labelData = this.labelData[labelIdx];
    labelData.ids.delete(id);

    // Remove id <-> value mapping.
    const value = labelData.idToValue.get(id);
    if (value !== undefined) {
      this.removeIdFromValue(labelIdx, id, value);
    }
    this.markIdMapAsDirty();
  }

  removeLabelOnIds(labelIdx: number, ids: number[]): void {
    this.validateIndex(labelIdx);
    for (const id of ids) {
      this.removeLabelOnId(labelIdx, id);
    }
    this.markIdMapAsDirty();
  }

  static fromCsv(dataset: Dataset, csvString: string): AnnotationParseResult {
    const annotationData = new AnnotationData();
    let mismatchedTimes = 0,
      mismatchedTracks = 0,
      unparseableRows = 0,
      invalidIds = 0;

    const result = Papa.parse(csvString, { header: true, skipEmptyLines: true, comments: "#" });
    if (result.errors.length > 0) {
      throw new Error(`Error parsing CSV: ${result.errors.map((e) => e.message).join(", ")}`);
    }
    const data = result.data as Record<string, string>[];
    const headers = result.meta.fields as string[];

    // Check for required ID column.
    if (headers.indexOf(CSV_COL_ID) === -1) {
      throw new Error(`CSV does not contain expected ID columns with the header "${CSV_COL_ID}".`);
    }
    // Remove the metadata columns
    const labelNames = headers.filter(
      (header) => header !== CSV_COL_ID && header !== CSV_COL_TRACK && header !== CSV_COL_TIME
    );
    const labelNameToType = getLabelTypeFromParsedCsv(headers, data);

    // Create each of the labels from a header in the CSV.
    for (let i = 0; i < labelNames.length; i++) {
      const name = labelNames[i].trim();
      const type = labelNameToType.get(name)!;
      annotationData.createNewLabel({
        name,
        type,
      });
    }

    for (const row of data) {
      const id = parseInt(row[CSV_COL_ID], 10);
      const track = parseInt(row[CSV_COL_TRACK], 10);
      const time = parseInt(row[CSV_COL_TIME], 10);

      if (isNaN(id) || isNaN(track) || isNaN(time)) {
        unparseableRows++;
        continue;
      }
      if (id < 0 || dataset.numObjects <= id) {
        invalidIds++;
        continue;
      }
      if (dataset.times?.[id] !== time) {
        mismatchedTimes++;
      }
      if (dataset.trackIds?.[id] !== track) {
        mismatchedTracks++;
      }
      // Push row data to the labels.
      for (let labelIdx = 0; labelIdx < labelNames.length; labelIdx++) {
        const labelData = annotationData.labelData[labelIdx];
        const isBoolean = labelData.options.type === LabelType.BOOLEAN;
        const name = labelNames[labelIdx];
        let value = row[name]?.trim();
        // Ignore invalid values (and omit boolean false values)
        if (value === undefined || value === "" || (isBoolean && value.toLowerCase() === BOOLEAN_VALUE_FALSE)) {
          continue;
        }
        if (isBoolean) {
          value = BOOLEAN_VALUE_TRUE;
        }
        annotationData.setLabelValueOnId(labelIdx, id, value);
      }
    }
    return { annotationData, mismatchedTimes, mismatchedTracks, unparseableRows, invalidIds, totalRows: data.length };
  }

  private findMatchingLabelIdx(name: string, type: LabelType): number {
    for (let i = 0; i < this.labelData.length; i++) {
      const labelData = this.labelData[i];
      if (labelData.options.name === name && labelData.options.type === type) {
        return i;
      }
    }
    return -1;
  }

  /**
   * Merges two annotation data objects and returns a new, resulting object,
   * based on the merge mode.
   */
  static merge(
    annotationData1: AnnotationData,
    annotationData2: AnnotationData,
    mergeMode: AnnotationMergeMode
  ): AnnotationData {
    const mergedAnnotationData = new AnnotationData();
    if (mergeMode === AnnotationMergeMode.OVERWRITE) {
      mergedAnnotationData.labelData = [...annotationData2.labelData.map(cloneLabel)];
      mergedAnnotationData.numLabelsCreated = annotationData2.numLabelsCreated;
    } else if (mergeMode === AnnotationMergeMode.APPEND) {
      mergedAnnotationData.labelData = [
        ...annotationData1.labelData.map(cloneLabel),
        ...annotationData2.labelData.map(cloneLabel),
      ];
      mergedAnnotationData.numLabelsCreated = annotationData1.numLabelsCreated + annotationData2.numLabelsCreated;
    } else {
      // merge
      mergedAnnotationData.labelData = [...annotationData1.labelData.map(cloneLabel)];
      mergedAnnotationData.numLabelsCreated = annotationData1.numLabelsCreated;
      for (const labelData2 of annotationData2.labelData) {
        const labelIdx = mergedAnnotationData.findMatchingLabelIdx(labelData2.options.name, labelData2.options.type);
        if (labelIdx !== -1) {
          // There's an existing label that matches on name + type. Merge the
          // IDs and overwrite the values.
          const labelData1 = mergedAnnotationData.labelData[labelIdx];
          labelData1.ids = new Set([...labelData1.ids, ...labelData2.ids]);
          for (const [value, ids] of labelData2.valueToIds.entries()) {
            mergedAnnotationData.setLabelValueOnIds(labelIdx, Array.from(ids), value);
          }
        } else {
          // Add the new label.
          mergedAnnotationData.labelData.push(cloneLabel(labelData2));
          mergedAnnotationData.numLabelsCreated++;
        }
      }
    }
    return mergedAnnotationData;
  }

  toCsv(dataset: Dataset, delimiter: string = ","): string {
    const idsToLabels = this.getIdsToLabels();
    const headerRow = [CSV_COL_ID, CSV_COL_TRACK, CSV_COL_TIME];

    headerRow.push(...this.labelData.map((label) => label.options.name.trim()));

    const csvRows: (string | number)[][] = [];
    // TODO: In the worst case scenario, there are many labels with many values,
    // and every ID is labeled with each. In this case, getValueFromId can be
    // O(N), which makes this for loop O(N^3)). Consider caching the lookup (ID
    // -> value) if the CSV export step is slow.
    for (const [id, labels] of idsToLabels) {
      const track = dataset.getTrackId(id);
      const time = dataset.getTime(id);

      const row: (string | number)[] = [id, track, time];
      for (let labelIdx = 0; labelIdx < this.labelData.length; labelIdx++) {
        if (labels.includes(labelIdx)) {
          row.push(this.getValueFromId(labelIdx, id) ?? "");
        } else if (this.labelData[labelIdx].options.type === LabelType.BOOLEAN) {
          row.push(BOOLEAN_VALUE_FALSE);
        } else {
          row.push("");
        }
      }
      csvRows.push(row);
    }

    const csvString = Papa.unparse(
      { fields: headerRow, data: csvRows },
      { delimiter: delimiter, header: true, escapeFormulae: true }
    );

    // TODO: Prepend additional metadata (e.g. label colors) when we add support
    // for importing annotation data? Some CSV parsers support adding comments
    // prefixed with `#`.

    return csvString;
  }

  clear(): void {
    this.labelData = [];
    this.numLabelsCreated = 0;
    this.markIdMapAsDirty();
  }
}
