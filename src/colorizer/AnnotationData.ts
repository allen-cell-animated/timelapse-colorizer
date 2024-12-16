import { Color } from "three";

import { DEFAULT_CATEGORICAL_PALETTE_KEY, KNOWN_CATEGORICAL_PALETTES } from "./colors/categorical_palettes";

import Dataset from "./Dataset";

export type LabelData = {
  name: string;
  color: Color;
  ids: Set<number>;
};

export interface IAnnotationData {
  /** Creates a new label and returns its index in the array of labels (as
   * returned by `getLabels()`).
   * @param name The name of the label. If no name is provided, a default name
   * ("Label {number}") will be used.
   * @param color The color to use for the label. If no color is provided, a
   * color will be chosen from the default categorical palette.
   * */
  createNewLabel(name?: string, color?: Color): number;

  /**
   * Returns the indices of all labels that have been applied to the provided
   * object id. (Indices are ordered as returned by `getLabels()`.)
   * @param id The object ID to look up label indices for.
   * @returns an array of label indices. Empty if no labels have been applied to
   * the ID.
   */
  getLabelIdxById(id: number): number[];

  /**
   * Returns all object IDs that have the given label (by index) applied.
   * @param labelIdx The index of the label to look up object IDs for.
   * @returns an array of object IDs. Empty if the label has not been applied to
   * any object IDs.
   */
  getIdsByLabelIdx(labelIdx: number): number[];

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
   * */
  getTimeToLabelIds(dataset: Dataset): Map<number, Record<number, number[]>>;

  /**
   * Returns the array of labels and their associated data (name, color, labeled
   * IDs), in index order.
   * @returns an array of label data objects, containing:
   * - `name`: The name of the label.
   * - `color`: The color of the label.
   * - `ids`: A set of object IDs that have the label applied.
   */
  getLabels(): LabelData[];
  setLabelName(labelIdx: number, name: string): void;
  setLabelColor(labelIdx: number, color: Color): void;
  deleteLabel(labelIdx: number): void;

  toggleLabelOnId(labelIdx: number, id: number): void;
  applyLabelToId(labelIdx: number, id: number): void;
  removeLabelFromId(labelIdx: number, id: number): void;
}

export class AnnotationData {
  private labelData: LabelData[];
  private numLabelsCreated: number;

  constructor() {
    this.labelData = [];
    this.numLabelsCreated = 0;

    this.getLabelIdxById = this.getLabelIdxById.bind(this);
    this.getIdsByLabelIdx = this.getIdsByLabelIdx.bind(this);
    this.getTimeToLabelIds = this.getTimeToLabelIds.bind(this);
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

  getLabelIdxById(id: number): number[] {
    const labelIdxs: number[] = [];
    for (let i = 0; i < this.labelData.length; i++) {
      if (this.labelData[i].ids.has(id)) {
        labelIdxs.push(i);
      }
    }
    return labelIdxs;
  }

  getIdsByLabelIdx(labelIdx: number): number[] {
    this.validateIndex(labelIdx);
    return Array.from(this.labelData[labelIdx].ids);
  }

  getTimeToLabelIds(dataset: Dataset): Map<number, Record<number, number[]>> {
    // Maps from time to a map of label indices to the IDs.
    const timeToLabelIds = new Map<number, Record<number, number[]>>();

    for (let labelIdx = 0; labelIdx < this.labelData.length; labelIdx++) {
      for (const id of this.labelData[labelIdx].ids) {
        const time = dataset.times?.[id];
        if (time === undefined) {
          continue;
        }
        if (!timeToLabelIds.has(time)) {
          timeToLabelIds.set(time, {});
        }
        if (!timeToLabelIds.get(time)![labelIdx]) {
          timeToLabelIds.get(time)![labelIdx] = [];
        }
        timeToLabelIds.get(time)![labelIdx].push(id);
      }
    }
    return timeToLabelIds;
  }

  getIdsByTime(labelIdx: number, dataset: Dataset, time: number): number[] {
    this.validateIndex(labelIdx);
    const ids: number[] = [];
    for (const id of this.labelData[labelIdx].ids) {
      if (dataset.times && dataset.times[id] === time) {
        ids.push(id);
      }
    }
    return ids;
  }

  getLabels(): LabelData[] {
    // TODO: Is a shallow copy okay here?
    return [...this.labelData];
  }

  // Setters

  /** Creates a new label and returns its index. */
  createNewLabel(name?: string, color?: Color): number {
    if (!color) {
      const palette = KNOWN_CATEGORICAL_PALETTES.get(DEFAULT_CATEGORICAL_PALETTE_KEY)!;
      color = new Color(palette.colorStops[this.numLabelsCreated % palette.colorStops.length]);
    }
    if (!name) {
      name = `Label ${this.numLabelsCreated}`;
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
  }

  applyLabelToId(labelIdx: number, id: number): void {
    this.validateIndex(labelIdx);
    this.labelData[labelIdx].ids.add(id);
  }

  removeLabelFromId(labelIdx: number, id: number): void {
    this.validateIndex(labelIdx);
    this.labelData[labelIdx].ids.delete(id);
  }

  toggleLabelOnId(labelIdx: number, id: number): void {
    this.validateIndex(labelIdx);
    if (!this.labelData[labelIdx].ids.has(id)) {
      this.applyLabelToId(labelIdx, id);
    } else {
      this.removeLabelFromId(labelIdx, id);
    }
  }
}
