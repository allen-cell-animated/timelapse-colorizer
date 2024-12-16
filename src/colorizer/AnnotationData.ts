import { Color } from "three";

import { DEFAULT_CATEGORICAL_PALETTE_KEY, KNOWN_CATEGORICAL_PALETTES } from "./colors/categorical_palettes";

import Dataset from "./Dataset";

export type LabelData = {
  name: string;
  color: Color;
  ids: Set<number>;
};

export interface IAnnotationData {
  createNewLabel(name?: string, color?: Color): number;
  getLabelIdxById(id: number): number[];
  getIdsByLabelIdx(labelIdx: number): number[];
  getTimeToLabelIds(dataset: Dataset): Map<number, Record<number, number[]>>;
  getLabels(): LabelData[];
  setLabelName(labelIdx: number, name: string): void;
  setLabelColor(labelIdx: number, color: Color): void;
  deleteLabel(labelIdx: number): void;
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
}
