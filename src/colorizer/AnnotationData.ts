import { Color } from "three";

import { DEFAULT_CATEGORICAL_PALETTE_KEY, KNOWN_CATEGORICAL_PALETTES } from "./colors/categorical_palettes";

import Dataset from "./Dataset";

export type LabelData = {
  name: string;
  color: Color;
  ids: Set<number>;
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
}

export interface IAnnotationDataSetters {
  /** Creates a new label and returns its index in the array of labels (as
   * returned by `getLabels()`).
   * @param name The name of the label. If no name is provided, a default name
   * ("Label {number}") will be used.
   * @param color The color to use for the label. If no color is provided, a
   * color will be chosen from the default categorical palette.
   * */
  createNewLabel(name?: string, color?: Color): number;

  setLabelName(labelIdx: number, name: string): void;
  setLabelColor(labelIdx: number, color: Color): void;
  deleteLabel(labelIdx: number): void;

  setLabelOnId(labelIdx: number, id: number, value: boolean): void;
}

export type IAnnotationData = IAnnotationDataGetters & IAnnotationDataSetters;

export class AnnotationData implements IAnnotationDataGetters, IAnnotationDataSetters {
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
    this.createNewLabel = this.createNewLabel.bind(this);
    this.setLabelName = this.setLabelName.bind(this);
    this.setLabelColor = this.setLabelColor.bind(this);
    this.deleteLabel = this.deleteLabel.bind(this);
    this.isLabelOnId = this.isLabelOnId.bind(this);
    this.setLabelOnId = this.setLabelOnId.bind(this);
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

  // Setters

  /** Creates a new label and returns its index. */
  createNewLabel(name?: string, color?: Color): number {
    if (!color) {
      const palette = KNOWN_CATEGORICAL_PALETTES.get(DEFAULT_CATEGORICAL_PALETTE_KEY)!;
      color = new Color(palette.colorStops[this.numLabelsCreated % palette.colorStops.length]);
    }
    if (!name) {
      name = `Label ${this.numLabelsCreated + 1}`;
    }

    this.labelData.push({
      name,
      color,
      ids: new Set(),
    });

    this.numLabelsCreated++;
    return this.labelData.length - 1;
  }

  private validateIndex(idx: number): void {
    if (idx < 0 || idx >= this.labelData.length) {
      throw new Error(`Invalid label index: ${idx}`);
    }
  }

  setLabelName(labelIdx: number, name: string): void {
    this.validateIndex(labelIdx);
    this.labelData[labelIdx].name = name;
  }

  setLabelColor(labelIdx: number, color: Color): void {
    this.validateIndex(labelIdx);
    this.labelData[labelIdx].color = color;
  }

  deleteLabel(labelIdx: number): void {
    this.validateIndex(labelIdx);
    this.labelData.splice(labelIdx, 1);
    this.timeToLabelIdMap = null;
  }

  setLabelOnId(labelIdx: number, id: number, value: boolean): void {
    this.validateIndex(labelIdx);
    if (value) {
      this.labelData[labelIdx].ids.add(id);
    } else {
      this.labelData[labelIdx].ids.delete(id);
    }
    this.timeToLabelIdMap = null;
  }
}
