import { Color } from "three";
import { describe, expect, it } from "vitest";

import { Dataset, DEFAULT_CATEGORICAL_PALETTE_KEY, KNOWN_CATEGORICAL_PALETTES } from "../../src/colorizer";

import { AnnotationData } from "../../src/colorizer/AnnotationData";

describe("AnnotationData", () => {
  const defaultPalette = KNOWN_CATEGORICAL_PALETTES.get(DEFAULT_CATEGORICAL_PALETTE_KEY)!;

  it("creates and returns index of new labels", () => {
    const annotationData = new AnnotationData();
    const labelIdx1 = annotationData.createNewLabel();
    const labelIdx2 = annotationData.createNewLabel();
    const labelIdx3 = annotationData.createNewLabel();
    expect(labelIdx1).toBe(0);
    expect(labelIdx2).toBe(1);
    expect(labelIdx3).toBe(2);
  });

  it("gives default colors and names to labels", () => {
    const annotationData = new AnnotationData();
    annotationData.createNewLabel();
    annotationData.createNewLabel();
    annotationData.createNewLabel();

    expect(annotationData.getLabels()).to.deep.equal([
      { name: "Label 0", color: defaultPalette.colors[0], ids: new Set() },
      { name: "Label 1", color: defaultPalette.colors[1], ids: new Set() },
      { name: "Label 2", color: defaultPalette.colors[2], ids: new Set() },
    ]);
  });

  it("allows updating of label names and colors", () => {
    const annotationData = new AnnotationData();
    annotationData.createNewLabel();
    annotationData.createNewLabel();
    annotationData.createNewLabel();

    annotationData.setLabelName(0, "New Label Name");
    annotationData.setLabelColor(1, new Color("#FF0000"));
    annotationData.setLabelName(2, "Another New Label Name");
    annotationData.setLabelColor(2, new Color("#00FF00"));

    expect(annotationData.getLabels()).to.deep.equal([
      { name: "New Label Name", color: defaultPalette.colors[0], ids: new Set() },
      { name: "Label 1", color: new Color("#FF0000"), ids: new Set() },
      { name: "Another New Label Name", color: new Color("#00FF00"), ids: new Set() },
    ]);
  });

  it("deletes labels", () => {
    const annotationData = new AnnotationData();
    annotationData.createNewLabel();
    annotationData.createNewLabel();
    annotationData.createNewLabel();

    annotationData.deleteLabel(1);
    expect(annotationData.getLabels()).to.deep.equal([
      { name: "Label 0", color: defaultPalette.colors[0], ids: new Set() },
      { name: "Label 2", color: defaultPalette.colors[2], ids: new Set() },
    ]);

    // Creating new label should reuse deleted index and increment name by 1
    annotationData.createNewLabel();
    expect(annotationData.getLabels()).to.deep.equal([
      { name: "Label 0", color: defaultPalette.colors[0], ids: new Set() },
      { name: "Label 2", color: defaultPalette.colors[2], ids: new Set() },
      { name: "Label 3", color: defaultPalette.colors[3], ids: new Set() },
    ]);
  });

  it("can apply and remove labels from an ID", () => {
    const annotationData = new AnnotationData();
    annotationData.createNewLabel();
    annotationData.createNewLabel();
    annotationData.applyLabelToId(0, 0);
    annotationData.applyLabelToId(0, 35);
    annotationData.applyLabelToId(0, 458);
    annotationData.applyLabelToId(1, 35);

    expect(annotationData.getLabelsAppliedToId(0)).to.deep.equal([0]);
    expect(annotationData.getLabelsAppliedToId(35)).to.deep.equal([0, 1]);
    expect(annotationData.getLabelsAppliedToId(458)).to.deep.equal([0]);

    annotationData.removeLabelFromId(0, 35);
    expect(annotationData.getLabelsAppliedToId(0)).to.deep.equal([0]);
    expect(annotationData.getLabelsAppliedToId(35)).to.deep.equal([1]);
    expect(annotationData.getLabelsAppliedToId(458)).to.deep.equal([0]);
  });

  it("can toggle labels on IDs", () => {
    const annotationData = new AnnotationData();
    annotationData.createNewLabel();
    annotationData.toggleLabelOnId(0, 0);
    annotationData.toggleLabelOnId(0, 45);
    annotationData.toggleLabelOnId(0, 872);
    expect(annotationData.getLabelsAppliedToId(0)).to.deep.equal([0]);
    expect(annotationData.getLabelsAppliedToId(45)).to.deep.equal([0]);
    expect(annotationData.getLabelsAppliedToId(872)).to.deep.equal([0]);

    annotationData.toggleLabelOnId(0, 45);
    expect(annotationData.getLabelsAppliedToId(0)).to.deep.equal([0]);
    expect(annotationData.getLabelsAppliedToId(45)).to.deep.equal([]);
    expect(annotationData.getLabelsAppliedToId(872)).to.deep.equal([0]);
  });

  it("can return mapping from time to labeled IDs", () => {
    const mockDataset = {
      times: [0, 1, 1, 2, 3, 4],
    };
    const annotationData = new AnnotationData();
    annotationData.createNewLabel();
    annotationData.toggleLabelOnId(0, 0);
    annotationData.toggleLabelOnId(0, 1);
    annotationData.toggleLabelOnId(0, 2);
    annotationData.toggleLabelOnId(0, 3);
    annotationData.toggleLabelOnId(0, 4);
    annotationData.toggleLabelOnId(0, 5);

    annotationData.createNewLabel();
    annotationData.toggleLabelOnId(1, 2);

    /* eslint-disable @typescript-eslint/naming-convention */
    // ESLint doesn't like "0" and "1" being property keys.
    expect(annotationData.getTimeToLabelIdMap(mockDataset as unknown as Dataset)).to.deep.equal(
      new Map([
        [0, { 0: [0] }],
        [1, { 0: [1, 2], 1: [2] }],
        [2, { 0: [3] }],
        [3, { 0: [4] }],
        [4, { 0: [5] }],
      ])
    );
    /* eslint-enable @typescript-eslint/naming-convention */
  });
});
