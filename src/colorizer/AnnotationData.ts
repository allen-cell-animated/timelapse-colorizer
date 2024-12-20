import { Color } from "three";

import { DEFAULT_CATEGORICAL_PALETTE_KEY, KNOWN_CATEGORICAL_PALETTES } from "./colors/categorical_palettes";

import Dataset from "./Dataset";

export type LabelData = {
  name: string;
  color: Color;
  ids: Set<number>;
};

export interface IAnnotationData {
  /**
   * Returns the array of label data objects.
   * @returns an array of `LabelData` objects, containing:
   * - `name`: The name of the label.
   * - `color`: The color of the label.
   * - `ids`: A set of object IDs that have the label applied.
   * Object properties SHOULD NOT be modified directly.
   */
  getLabels(): LabelData[];

  /** Creates a new label and returns its index in the array of labels (as
   * returned by `getLabels()`).
   * @param name The name of the label. If no name is provided, a default name
   * ("Label {number}") will be used.
   * @param color The color to use for the label. If no color is provided, a
   * color will be chosen from the default categorical palette.
   * */
  createNewLabel(name?: string, color?: Color): number;

  /**
   * Returns the indices of all labels that have been applied to the object id.
   * (Indices are ordered as returned by `getLabels()`.)
   * @param id The object ID to look up label indices for.
   * @returns an array of label indices. Empty if no labels have been applied to
   * the ID.
   */
  getLabelsAppliedToId(id: number): number[];

  /**
   * Returns all object IDs that the label has been applied to.
   * @param labelIdx The index of the label to look up object IDs for.
   * @returns an array of object IDs. Empty if the label has not been applied to
   * any object IDs.
   */
  getLabeledIds(labelIdx: number): number[];

  /**
   * Returns a map from a frame number to the labeled object IDs present at that
   * frame, represented as a record mapping label indices to IDs.
   *
   * The record's keys are an index of a label (as returned by `getLabels()`),
   * and the values are arrays of object IDs present for that time frame that
   * have that label applied.
   *
   * @param dataset The dataset to use for time information.
   * @returns a map from time to a record of label indices to IDs.
   * @example
   * ```typescript
   * // Let's say we have two labels (0 and 1). There are objects with IDs 1, 2,
   * // and 3 at time 0, and IDs 4 and 5 at time 1.
   * // Label 0 has been applied to objects 1, 2, 3, and 4.
   * // Label 1 has been applied to objects 3 and 5.
   *
   * const timeToLabelMap = getTimeToLabelIdMap(some_dataset);
   * timeToLabelMap.get(0); // { 0: [1, 2, 3], 1: [3] }
   * timeToLabelMap.get(1); // { 0: [4], 1: [5]}
   * ```
   * */
  getTimeToLabelIdMap(dataset: Dataset): Map<number, Record<number, number[]>>;

  setLabelName(labelIdx: number, name: string): void;
  setLabelColor(labelIdx: number, color: Color): void;
  deleteLabel(labelIdx: number): void;

  applyLabelToId(labelIdx: number, id: number): void;
  removeLabelFromId(labelIdx: number, id: number): void;
  toggleLabelOnId(labelIdx: number, id: number): void;
}

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
    this.createNewLabel = this.createNewLabel.bind(this);
    this.setLabelName = this.setLabelName.bind(this);
    this.setLabelColor = this.setLabelColor.bind(this);
    this.deleteLabel = this.deleteLabel.bind(this);
    this.toggleLabelOnId = this.toggleLabelOnId.bind(this);
    this.applyLabelToId = this.applyLabelToId.bind(this);
    this.removeLabelFromId = this.removeLabelFromId.bind(this);
  }

  // Getters

  getLabels(): LabelData[] {
    return [...this.labelData];
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
      name: name,
      color: color,
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

  applyLabelToId(labelIdx: number, id: number): void {
    this.validateIndex(labelIdx);
    this.labelData[labelIdx].ids.add(id);
    this.timeToLabelIdMap = null;
  }

  removeLabelFromId(labelIdx: number, id: number): void {
    this.validateIndex(labelIdx);
    this.labelData[labelIdx].ids.delete(id);
    this.timeToLabelIdMap = null;
  }

  toggleLabelOnId(labelIdx: number, id: number): void {
    if (!this.labelData[labelIdx].ids.has(id)) {
      this.applyLabelToId(labelIdx, id);
    } else {
      this.removeLabelFromId(labelIdx, id);
    }
  }
}