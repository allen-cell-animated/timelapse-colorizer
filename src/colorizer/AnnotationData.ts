import { parse, unparse } from "papaparse";
import { Color } from "three";

import { DEFAULT_CATEGORICAL_PALETTE_KEY, KNOWN_CATEGORICAL_PALETTES } from "src/colorizer/colors/categorical_palettes";
import { CSV_COL_DATASET, CSV_COL_ID, CSV_COL_SEG_ID, CSV_COL_TIME, CSV_COL_TRACK } from "src/colorizer/constants";
import type Dataset from "src/colorizer/Dataset";
import { cloneLabelData, getLabelTypeFromParsedCsv, removeUndefinedProperties } from "src/colorizer/utils/data_utils";

export const BOOLEAN_VALUE_TRUE = "true";
export const BOOLEAN_VALUE_FALSE = "false";

export const DEFAULT_ANNOTATION_LABEL_COLORS = KNOWN_CATEGORICAL_PALETTES.get(
  DEFAULT_CATEGORICAL_PALETTE_KEY
)!.colorStops;

/** Gets a default color for a label based on the index. */
function getDefaultColor(index: number): Color {
  return new Color(DEFAULT_ANNOTATION_LABEL_COLORS[index % DEFAULT_ANNOTATION_LABEL_COLORS.length]);
}

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

// TODO: Move to a separate types file
export type LabelIdData = {
  ids: Set<number>;
  // Bidirectional mapping between IDs and values.
  valueToIds: Map<string, Set<number>>;
  idToValue: Map<number, string>;
};

export type LabelData = {
  options: LabelOptions;
  lastValue: string | null;

  datasetToIdData: Map<string, LabelIdData>;

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
   * The number of annotated objects that had labels that did not match
   * those of the dataset. If > 0, this likely indicates that annotations
   * for a different dataset were imported, or that the dataset was modified.
   */
  mismatchedLabels: number;
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
  /**
   * Rows belonging to datasets other than the one currently loaded, that could
   * not be directly checked for validity.
   */
  unvalidatedIds: number;
  totalRows: number;
};

export interface IAnnotationDataGetters {
  /**
   * Returns the array of label data objects.
   * @returns an array of `LabelData` objects, containing:
   * - `name`: The name of the label.
   * - `color`: The color of the label.
   * - `datasetToIdData`: A mapping from dataset keys to per-dataset label data
   *   per ID. Object properties SHOULD NOT be modified directly.
   */
  getLabels(): LabelData[];

  /**
   * Returns the indices of all labels that have been applied to the object id
   * in the specified dataset. (Indices are ordered as returned by
   * `getLabels()`.)
   * @param datasetKey The key of the dataset to look up.
   * @param id The object ID to look up label indices for.
   * @returns an array of label indices. Empty if no labels have been applied to
   * the ID.
   */
  getLabelsAppliedToId(datasetKey: string, id: number): number[];

  /**
   * Returns whether the label has been applied to the object ID in the dataset.
   * @param datasetKey The key of the dataset to look up.
   * @param labelIdx The index of the label to look up.
   * @param id The object ID.
   * @returns `true` if the label has been applied to the object ID, `false`
   * otherwise.
   */
  isLabelOnId(datasetKey: string, labelIdx: number, id: number): boolean;

  /**
   * Returns all object IDs that the label has been applied to in a dataset.
   * @param datasetKey The key of the dataset to look up IDs for.
   * @param labelIdx The index of the label to look up object IDs for.
   * @returns an array of object IDs. Empty if the label has not been applied to
   * any object IDs.
   */
  getLabeledIds(datasetKey: string, labelIdx: number): number[];

  /**
   * Returns a time to label and ID map for a given dataset, in the format
   * `{time: {labelId: [objectIds]}}`.
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
   * @param datasetKey The key of the dataset to look up.
   * @param dataset The dataset to use for time information.
   * @returns a map from time to a record of label indices to IDs.
   * @example
   * ```typescript
   * // Let's say we have two labels (0 and 1). There are objects with IDs 11, 12,
   * // and 13 at time 234, and ID 14 and 15 at time 577.
   * // Label 0 has been applied to objects 11, 12, and 13.
   * // Label 1 has been applied to objects 13, 14, and 15.
   *
   * const timeToLabelMap = getTimeToLabelIdMap(some_dataset_key, some_dataset);
   * timeToLabelMap.get(234); // { 0: [11, 12, 13], 1: [13] }
   * timeToLabelMap.get(577); // { 1: [14, 15]}
   * ```
   * */
  getTimeToLabelIdMap(datasetKey: string, dataset: Dataset): Map<number, Record<number, number[]>>;

  /**
   * Returns the next default label settings, including name and color. Useful
   * for ensuring labels have unique names and colors, even if some have been
   * deleted.
   */
  getNextDefaultLabelSettings(): LabelOptions;

  getNextDefaultLabelValue(labelIdx: number, useLastValue: boolean): string;

  getValueFromId(datasetKey: string, labelIdx: number, id: number): string | null;

  /**
   * Converts the annotation data to a CSV string.
   *
   * @param delimiter The delimiter to use between cells. Default is a comma
   * (",").
   * @returns Returns a comma-separated value (CSV) string representation of the
   * annotation data, including a header. The header will contain the columns:
   *   - Dataset (dataset key)
   *   - ID (object ID)
   *   - Label (segmentation ID)
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
  toCsv(separator?: string): string;
}

export interface IAnnotationDataSetters {
  /**
   * Creates a new label with the given options and returns its index in the
   * array of labels (as returned by `getLabels()`).
   * */
  createNewLabel(options?: Partial<LabelOptions>): number;
  setLabelOptions(labelIdx: number, options: Partial<LabelOptions>): void;
  deleteLabel(labelIdx: number): void;
  setLabelValueOnIds(datasetKey: string, dataset: Dataset, labelIdx: number, ids: number[], value: string): void;
  removeLabelOnIds(datasetKey: string, labelIdx: number, ids: number[]): void;
  clear(): void;
}

export type IAnnotationData = IAnnotationDataGetters & IAnnotationDataSetters;

export class AnnotationData implements IAnnotationData {
  private labelData: LabelData[];
  private numLabelsCreated: number;
  /**
   * Cached mapping from dataset => time => label indices => IDs. Must be
   * invalidated when labels are removed, or if annotations are applied to or
   * removed from objects.
   */
  private datasetToTimeToLabelIdMap: Map<string, Map<number, Record<number, number[]>>>;

  /**
   * Stored metadata for labeled IDs, per dataset. Maps from dataset key => ID
   * => metadata, where metadata is a length-3 Uint32Array containing `[track,
   * time, segId]` in that order. Used for CSV export.
   *
   * Uses a Uint32Array for compact memory use compared to an object or regular
   * Array (smaller + guaranteed to be adjacent in memory).
   */
  private datasetToIdMetadataMap: Map<string, Map<number, Uint32Array>>;

  constructor() {
    this.labelData = [];
    this.numLabelsCreated = 0;
    this.datasetToTimeToLabelIdMap = new Map();
    this.datasetToIdMetadataMap = new Map();

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

  isLabelOnId(datasetKey: string, labelIdx: number, id: number): boolean {
    this.validateIndex(labelIdx);
    const labelIdData = this.labelData[labelIdx].datasetToIdData?.get(datasetKey);
    return labelIdData?.ids.has(id) ?? false;
  }

  /** Returns true if the ID is labeled in any label. */
  private isIdLabeled(datasetKey: string, id: number): boolean {
    for (let i = 0; i < this.labelData.length; i++) {
      if (this.isLabelOnId(datasetKey, i, id)) {
        return true;
      }
    }
    return false;
  }

  getLabelsAppliedToId(datasetKey: string, id: number): number[] {
    const labelIdxs: number[] = [];
    for (let i = 0; i < this.labelData.length; i++) {
      const labelIdData = this.labelData[i].datasetToIdData.get(datasetKey);
      if (labelIdData?.ids.has(id)) {
        labelIdxs.push(i);
      }
    }
    return labelIdxs;
  }

  getLabeledIds(datasetKey: string, labelIdx: number): number[] {
    this.validateIndex(labelIdx);
    const labelIdData = this.labelData[labelIdx].datasetToIdData.get(datasetKey);
    return labelIdData ? Array.from(labelIdData.ids) : [];
  }

  getTimeToLabelIdMap(datasetKey: string, dataset: Dataset): Map<number, Record<number, number[]>> {
    if (this.datasetToTimeToLabelIdMap.has(datasetKey)) {
      return this.datasetToTimeToLabelIdMap.get(datasetKey)!;
    }

    const timeToLabelIdMap = new Map<number, Record<number, number[]>>();

    for (let labelIdx = 0; labelIdx < this.labelData.length; labelIdx++) {
      const ids = this.labelData[labelIdx].datasetToIdData.get(datasetKey)?.ids;
      if (!ids) {
        continue;
      }
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
    this.datasetToTimeToLabelIdMap.set(datasetKey, timeToLabelIdMap);
    return timeToLabelIdMap;
  }

  getIdsToLabels(datasetKey: string): Map<number, number[]> {
    const idsToLabels = new Map<number, number[]>();
    for (let labelIdx = 0; labelIdx < this.labelData.length; labelIdx++) {
      const ids = this.labelData[labelIdx].datasetToIdData.get(datasetKey)?.ids;
      if (!ids) {
        continue;
      }
      for (const id of ids) {
        if (!idsToLabels.has(id)) {
          idsToLabels.set(id, []);
        }
        idsToLabels.get(id)!.push(labelIdx);
      }
    }
    return idsToLabels;
  }

  getValueFromId(datasetKey: string, labelIdx: number, id: number): string | null {
    this.validateIndex(labelIdx);
    const labelIdData = this.labelData[labelIdx].datasetToIdData.get(datasetKey);
    const value = labelIdData?.idToValue.get(id);
    return value ?? null;
  }

  getNextDefaultLabelSettings(): LabelOptions {
    const color = getDefaultColor(this.numLabelsCreated);
    const name = `Annotation ${this.numLabelsCreated + 1}`;
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

  private markIdMapAsDirty(datasetKey?: string): void {
    if (datasetKey === undefined) {
      this.datasetToTimeToLabelIdMap.clear();
    } else {
      this.datasetToTimeToLabelIdMap.delete(datasetKey);
    }
  }

  private getLabelIdData(labelIdx: number, datasetKey: string): LabelIdData {
    const labelData = this.labelData[labelIdx];
    if (!labelData.datasetToIdData.has(datasetKey)) {
      // Create new per-dataset ID data if it does not exist.
      labelData.datasetToIdData.set(datasetKey, {
        ids: new Set<number>(),
        valueToIds: new Map<string, Set<number>>(),
        idToValue: new Map<number, string>(),
      });
    }
    return labelData.datasetToIdData.get(datasetKey)!;
  }

  /** Creates a new label and returns its index. */
  createNewLabel(options: Partial<LabelOptions> = {}): number {
    options = removeUndefinedProperties(options);
    this.labelData.push({
      options: { ...this.getNextDefaultLabelSettings(), ...options },
      datasetToIdData: new Map<string, LabelIdData>(),
      lastValue: null,
    });

    this.numLabelsCreated++;
    return this.labelData.length - 1;
  }

  private validateIndex(idx: number): void {
    if (idx < 0 || idx >= this.labelData.length) {
      throw new Error(`Invalid annotation index: ${idx}`);
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
    const label = this.labelData.splice(labelIdx, 1)[0];
    // Check for and remove unused metadata for IDs that are no longer labeled.
    for (const [datasetKey, labelData] of label.datasetToIdData.entries()) {
      for (const id of labelData.ids) {
        if (!this.isIdLabeled(datasetKey, id)) {
          this.removeStoredIdMetadata(datasetKey, id);
        }
      }
    }
    this.markIdMapAsDirty();
  }

  //// ID Metadata ////
  // Used for storing track, time, and segmentation ID info for CSV export.

  private addStoredIdMetadata(datasetKey: string, id: number, track: number, time: number, segId: number): void {
    if (!this.datasetToIdMetadataMap.has(datasetKey)) {
      this.datasetToIdMetadataMap.set(datasetKey, new Map());
    }
    const idMetadataMap = this.datasetToIdMetadataMap.get(datasetKey)!;
    // Always stored in track, time, segId order.
    idMetadataMap.set(id, new Uint32Array([track, time, segId]));
  }

  private getStoredIdMetadata(datasetKey: string, id: number): { track: number; time: number; segId: number } {
    const idMetadataMap = this.datasetToIdMetadataMap.get(datasetKey);
    const metadata = idMetadataMap?.get(id) ?? null;
    if (!metadata) {
      // -1 values will flag as mismatched during CSV import.
      return { track: -1, time: -1, segId: -1 };
    }
    return {
      track: metadata[0],
      time: metadata[1],
      segId: metadata[2],
    };
  }

  /**
   * Copies stored ID metadata from the provided map into the internal map.
   * Overrides existing metadata for IDs that are already present.
   */
  private applyStoredIdMetadata(datasetToIdMetadataMap: Map<string, Map<number, Uint32Array>>): void {
    for (const [datasetKey, idToMetadata] of datasetToIdMetadataMap.entries()) {
      if (!this.datasetToIdMetadataMap.has(datasetKey)) {
        this.datasetToIdMetadataMap.set(datasetKey, new Map());
      }
      for (const [id, metadata] of idToMetadata.entries()) {
        this.datasetToIdMetadataMap.get(datasetKey)!.set(id, metadata);
      }
    }
  }

  private removeStoredIdMetadata(datasetKey: string, id: number): void {
    const idMetadataMap = this.datasetToIdMetadataMap.get(datasetKey);
    if (!idMetadataMap) {
      return;
    }
    idMetadataMap.delete(id);
  }

  ////

  /**
   * Removes a single ID from a label, updating the internal maps (valueToIds,
   * ids, and idToValue).
   */
  private removeId(datasetKey: string, labelIdx: number, id: number): void {
    const labelIdData = this.labelData[labelIdx].datasetToIdData.get(datasetKey);
    if (!labelIdData) {
      return;
    }

    this.markIdMapAsDirty(datasetKey);
    labelIdData.ids.delete(id);

    // Update value to ID mappings
    const value = labelIdData.idToValue.get(id);
    if (value !== undefined) {
      if (labelIdData.valueToIds.has(value)) {
        const ids = labelIdData.valueToIds.get(value)!;
        ids.delete(id);
        if (ids.size === 0) {
          labelIdData.valueToIds.delete(value);
        }
      }
      if (labelIdData.idToValue.has(id)) {
        labelIdData.idToValue.delete(id);
      }
    }
  }

  private setLabelValueOnId(
    datasetKey: string,
    labelIdx: number,
    id: number,
    value: string,
    metadata: { track: number; time: number; segId: number }
  ): void {
    this.validateIndex(labelIdx);

    const labelData = this.labelData[labelIdx];
    const labelIdData = this.getLabelIdData(labelIdx, datasetKey);
    if (labelIdData.ids.has(id)) {
      this.removeId(datasetKey, labelIdx, id);
    }
    if (!labelIdData.valueToIds.has(value)) {
      labelIdData.valueToIds.set(value, new Set());
    }
    labelIdData.valueToIds.get(value)!.add(id);
    labelIdData.idToValue.set(id, value);

    labelIdData.ids.add(id);
    labelData.lastValue = value;

    this.addStoredIdMetadata(datasetKey, id, metadata.track, metadata.time, metadata.segId);
    this.markIdMapAsDirty(datasetKey);
  }

  setLabelValueOnIds(datasetKey: string, dataset: Dataset, labelIdx: number, ids: number[], value: string): void {
    this.validateIndex(labelIdx);
    for (const id of ids) {
      const metadata = {
        track: dataset.getTrackId(id),
        time: dataset.getTime(id),
        segId: dataset.getSegmentationId(id),
      };
      this.setLabelValueOnId(datasetKey, labelIdx, id, value, metadata);
    }
    this.markIdMapAsDirty(datasetKey);
  }

  private removeLabelOnId(datasetKey: string, labelIdx: number, id: number): void {
    this.validateIndex(labelIdx);
    const labelIdData = this.labelData[labelIdx].datasetToIdData.get(datasetKey);
    if (!labelIdData) {
      return;
    }
    this.removeId(datasetKey, labelIdx, id);
    if (labelIdData.ids.size === 0) {
      this.labelData[labelIdx].datasetToIdData.delete(datasetKey);
    }
    if (!this.isIdLabeled(datasetKey, id)) {
      this.removeStoredIdMetadata(datasetKey, id);
    }
    this.markIdMapAsDirty(datasetKey);
  }

  removeLabelOnIds(datasetKey: string, labelIdx: number, ids: number[]): void {
    this.validateIndex(labelIdx);
    for (const id of ids) {
      this.removeLabelOnId(datasetKey, labelIdx, id);
    }
    this.markIdMapAsDirty(datasetKey);
  }

  static fromCsv(datasetKey: string, dataset: Dataset, csvString: string): AnnotationParseResult {
    const annotationData = new AnnotationData();
    let mismatchedTimes = 0,
      mismatchedTracks = 0,
      mismatchedLabels = 0,
      unparseableRows = 0,
      invalidIds = 0,
      unvalidatedIds = 0;

    const result = parse(csvString, { header: true, skipEmptyLines: true, comments: "#" });
    if (result.errors.length > 0) {
      throw new Error(`Error parsing CSV: ${result.errors.map((e) => e.message).join(", ")}`);
    }
    const data = result.data as Record<string, string>[];
    const headers = result.meta.fields as string[];

    // Check for required ID column.
    if (headers.indexOf(CSV_COL_ID) === -1) {
      throw new Error(`CSV does not contain expected ID column with the header '${CSV_COL_ID}'.`);
    }
    // Remove the metadata columns
    const labelNames = headers.filter(
      (header) =>
        header !== CSV_COL_DATASET &&
        header !== CSV_COL_ID &&
        header !== CSV_COL_TRACK &&
        header !== CSV_COL_TIME &&
        header !== CSV_COL_SEG_ID
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
      const datasetCol = row[CSV_COL_DATASET] || datasetKey;
      const id = parseInt(row[CSV_COL_ID], 10);
      let track = parseInt(row[CSV_COL_TRACK], 10);
      let time = parseInt(row[CSV_COL_TIME], 10);
      // Seg ID is optional/can be NaN because it was added as a column after
      // annotation export was first introduced.
      let segId = parseInt(row[CSV_COL_SEG_ID], 10);

      if (isNaN(id) || isNaN(track) || isNaN(time)) {
        unparseableRows++;
        continue;
      }
      if (datasetCol !== datasetKey) {
        unvalidatedIds++;
      } else {
        // Only validate IDs that match currently loaded data
        if (id < 0 || dataset.numObjects <= id) {
          invalidIds++;
          continue;
        }
        // Check for mismatched metadata and update to the dataset values.
        const datasetTime = dataset.getTime(id);
        const datasetTrack = dataset.getTrackId(id);
        const datasetSegId = dataset.getSegmentationId(id);
        if (datasetTime !== time) {
          mismatchedTimes++;
          time = datasetTime;
        }
        if (datasetTrack !== track) {
          mismatchedTracks++;
          track = datasetTrack;
        }
        if (datasetSegId !== segId) {
          if (!Number.isNaN(segId)) {
            mismatchedLabels++;
          }
          segId = datasetSegId;
        }
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
        annotationData.setLabelValueOnId(datasetCol, labelIdx, id, value, { track, time, segId });
      }
    }
    return {
      annotationData,
      mismatchedTimes,
      mismatchedTracks,
      mismatchedLabels,
      unparseableRows,
      invalidIds,
      unvalidatedIds,
      totalRows: data.length,
    };
  }
  /**
   * Returns the index of a label with the matching name and type.
   * Returns -1 if no such label exists.
   */
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
   * based on the merge mode. Data is deep-copied, so the original objects are
   * not modified.
   * @param annotationData1 The first annotation data object.
   * @param annotationData2 The second annotation data object.
   * @param mergeMode The merge mode to use. Can be one of:
   * - `AnnotationMergeMode.APPEND`: Appends the labels from the second
   *    annotation data object to the first one.
   * - `AnnotationMergeMode.MERGE`: Merges label data for labels that match name
   *   and type. If a label exists in both objects, the IDs are merged, with the
   *   second object taking precedence for the values. Labels that do not match
   *   are appended.
   * - `AnnotationMergeMode.OVERWRITE`: Returns a copy of the second annotation
   *   data object.
   * @param reassignColors If true, reassigns colors on labels appended from the
   *   second annotation data object to the default for that index. Defaults to
   *   true.
   * @returns A new annotation data object with the merged label data.
   */
  static merge(
    annotationData1: AnnotationData,
    annotationData2: AnnotationData,
    mergeMode: AnnotationMergeMode,
    reassignColors: boolean = true
  ): AnnotationData {
    const mergedAnnotationData = new AnnotationData();

    if (mergeMode === AnnotationMergeMode.OVERWRITE) {
      mergedAnnotationData.labelData = [...annotationData2.labelData.map(cloneLabelData)];
      mergedAnnotationData.numLabelsCreated = annotationData2.numLabelsCreated;
      mergedAnnotationData.applyStoredIdMetadata(annotationData2.datasetToIdMetadataMap);
      if (reassignColors) {
        for (let i = 0; i < mergedAnnotationData.labelData.length; i++) {
          mergedAnnotationData.labelData[i].options.color = getDefaultColor(i);
        }
      }
    } else if (mergeMode === AnnotationMergeMode.APPEND) {
      mergedAnnotationData.labelData = [
        ...annotationData1.labelData.map(cloneLabelData),
        ...annotationData2.labelData.map(cloneLabelData),
      ];
      if (reassignColors) {
        for (let i = annotationData1.labelData.length; i < mergedAnnotationData.labelData.length; i++) {
          mergedAnnotationData.labelData[i].options.color = getDefaultColor(i);
        }
      }
      mergedAnnotationData.applyStoredIdMetadata(annotationData1.datasetToIdMetadataMap);
      mergedAnnotationData.applyStoredIdMetadata(annotationData2.datasetToIdMetadataMap);
      mergedAnnotationData.numLabelsCreated = annotationData1.numLabelsCreated + annotationData2.numLabelsCreated;
    } else {
      // Merge
      mergedAnnotationData.labelData = [...annotationData1.labelData.map(cloneLabelData)];
      mergedAnnotationData.numLabelsCreated = annotationData1.numLabelsCreated;
      // For each label in the second annotation data object, check if it
      // exists in the first. If so, merge the IDs and overwrite the values.
      for (const labelData2 of annotationData2.labelData) {
        const labelIdx = mergedAnnotationData.findMatchingLabelIdx(labelData2.options.name, labelData2.options.type);
        if (labelIdx !== -1) {
          // There's an existing label that matches on name + type. Merge per-dataset
          // IDs and overwrite the values.
          for (const [datasetKey, perDatasetData] of labelData2.datasetToIdData.entries()) {
            for (const [value, ids] of perDatasetData.valueToIds.entries()) {
              for (const id of ids) {
                const metadata = annotationData2.getStoredIdMetadata(datasetKey, id);
                mergedAnnotationData.setLabelValueOnId(datasetKey, labelIdx, id, value, metadata);
              }
            }
          }
        } else {
          // No match, so append as a new label.
          const newLabelData = cloneLabelData(labelData2);
          if (reassignColors) {
            newLabelData.options.color = getDefaultColor(mergedAnnotationData.numLabelsCreated);
          }
          mergedAnnotationData.labelData.push(newLabelData);
          mergedAnnotationData.numLabelsCreated++;
        }
      }
      mergedAnnotationData.applyStoredIdMetadata(annotationData1.datasetToIdMetadataMap);
      mergedAnnotationData.applyStoredIdMetadata(annotationData2.datasetToIdMetadataMap);
    }
    return mergedAnnotationData;
  }

  public get datasetKeys(): Set<string> {
    let datasetKeys = new Set<string>();
    for (const labelData of this.labelData) {
      datasetKeys = new Set([...datasetKeys, ...labelData.datasetToIdData.keys()]);
    }
    return datasetKeys;
  }

  toCsv(delimiter: string = ","): string {
    const headerRow = [CSV_COL_DATASET, CSV_COL_ID, CSV_COL_SEG_ID, CSV_COL_TRACK, CSV_COL_TIME];

    headerRow.push(...this.labelData.map((label) => label.options.name.trim()));

    const csvRows: (string | number)[][] = [];
    // TODO: In the worst case scenario, there are many labels with many values,
    // and every ID is labeled with each. In this case, getValueFromId can be
    // O(N), which makes this for loop O(N^3)). Consider caching the lookup (ID
    // -> value) if the CSV export step is slow.
    for (const key of this.datasetKeys) {
      const idsToLabels = this.getIdsToLabels(key);
      for (const [id, labels] of idsToLabels) {
        const { segId, track, time } = this.getStoredIdMetadata(key, id);

        const row: (string | number)[] = [key, id, segId, track, time];
        for (let labelIdx = 0; labelIdx < this.labelData.length; labelIdx++) {
          if (labels.includes(labelIdx)) {
            row.push(this.getValueFromId(key, labelIdx, id) ?? "");
          } else if (this.labelData[labelIdx].options.type === LabelType.BOOLEAN) {
            row.push(BOOLEAN_VALUE_FALSE);
          } else {
            row.push("");
          }
        }
        csvRows.push(row);
      }
    }

    const csvString = unparse(
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
