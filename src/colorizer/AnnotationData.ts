import { Color } from "three";

import { DEFAULT_CATEGORICAL_PALETTE_KEY, KNOWN_CATEGORICAL_PALETTES } from "./colors/categorical_palettes";

import Dataset from "./Dataset";

export type LabelData = {
  name: string;
  color: Color;
  ids: Set<number>;
};

export interface AnnotationDataInterface {
  createNewLabel(name?: string, color?: Color): number;
  getLabelIdxById(id: number): number[];
  getIdsByLabelIdx(labelIdx: number): number[];
  getIdsByTime(labelIdx: number, dataset: Dataset, time: number): number[];
  getLabels(): Omit<LabelData, "ids">[];
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

  getLabels(): Omit<LabelData, "ids">[] {
    return this.labelData.map((label) => ({ name: label.name, color: label.color }));
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
