import { Color } from "three";
import { describe, expect, it } from "vitest";

import { Dataset, DEFAULT_CATEGORICAL_PALETTE_KEY, KNOWN_CATEGORICAL_PALETTES } from "../../src/colorizer";
import { compareRecord } from "../state/ViewerState/utils";

import { AnnotationData, BOOLEAN_VALUE } from "../../src/colorizer/AnnotationData";

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

    const labels = annotationData.getLabels();
    expect(labels.length).toBe(3);
    compareRecord(labels[0].options, { name: "Label 1", color: defaultPalette.colors[0] });
    compareRecord(labels[1].options, { name: "Label 2", color: defaultPalette.colors[1] });
    compareRecord(labels[2].options, { name: "Label 3", color: defaultPalette.colors[2] });
  });

  it("allows updating of label names and colors", () => {
    const annotationData = new AnnotationData();
    annotationData.createNewLabel();
    annotationData.createNewLabel();
    annotationData.createNewLabel();

    annotationData.setLabelOptions(0, { name: "New Label Name" });
    annotationData.setLabelOptions(1, { color: new Color("#FF0000") });
    annotationData.setLabelOptions(2, { name: "Another New Label Name", color: new Color("#00FF00") });

    const labels = annotationData.getLabels();
    expect(labels.length).toBe(3);
    compareRecord(labels[0].options, { name: "New Label Name", color: defaultPalette.colors[0] });
    compareRecord(labels[1].options, { name: "Label 2", color: new Color("#FF0000") });
    compareRecord(labels[2].options, { name: "Another New Label Name", color: new Color("#00FF00") });
  });

  it("deletes labels", () => {
    const annotationData = new AnnotationData();
    annotationData.createNewLabel();
    annotationData.createNewLabel();
    annotationData.createNewLabel();

    annotationData.deleteLabel(1);
    let labels = annotationData.getLabels();
    expect(labels.length).toBe(2);
    compareRecord(labels[0].options, { name: "Label 1", color: defaultPalette.colors[0] });
    compareRecord(labels[1].options, { name: "Label 3", color: defaultPalette.colors[2] });

    // Creating new label should reuse deleted index and increment name by 1
    annotationData.createNewLabel();
    labels = annotationData.getLabels();
    expect(labels.length).toBe(3);
    compareRecord(labels[0].options, { name: "Label 1", color: defaultPalette.colors[0] });
    compareRecord(labels[1].options, { name: "Label 3", color: defaultPalette.colors[2] });
    compareRecord(labels[2].options, { name: "Label 4", color: defaultPalette.colors[3] });
  });

  it("can apply and remove labels from an ID", () => {
    const annotationData = new AnnotationData();
    annotationData.createNewLabel();
    annotationData.createNewLabel();
    annotationData.setLabelValueOnIds(0, [0, 35, 458], BOOLEAN_VALUE);
    annotationData.setLabelValueOnIds(1, [35], BOOLEAN_VALUE);

    expect(annotationData.getLabelsAppliedToId(0)).to.deep.equal([0]);
    expect(annotationData.getLabelsAppliedToId(35)).to.deep.equal([0, 1]);
    expect(annotationData.getLabelsAppliedToId(458)).to.deep.equal([0]);

    annotationData.removeLabelOnIds(0, [35]);
    expect(annotationData.getLabelsAppliedToId(0)).to.deep.equal([0]);
    expect(annotationData.getLabelsAppliedToId(35)).to.deep.equal([1]);
    expect(annotationData.getLabelsAppliedToId(458)).to.deep.equal([0]);
  });

  it("ignores duplicate calls to setLabelOnIds", () => {
    const annotationData = new AnnotationData();
    annotationData.createNewLabel();
    annotationData.createNewLabel();
    annotationData.setLabelValueOnIds(0, [0], BOOLEAN_VALUE);
    annotationData.setLabelValueOnIds(0, [0], BOOLEAN_VALUE);
    annotationData.setLabelValueOnIds(0, [1], BOOLEAN_VALUE);

    expect(annotationData.getLabelsAppliedToId(0)).to.deep.equal([0]);
    expect(annotationData.isLabelOnId(0, 0)).toBe(true);
    expect(annotationData.getLabelsAppliedToId(1)).to.deep.equal([0]);
    expect(annotationData.isLabelOnId(0, 1)).toBe(true);

    annotationData.removeLabelOnIds(0, [0]);
    annotationData.removeLabelOnIds(0, [0]);
    annotationData.removeLabelOnIds(0, [1]);

    expect(annotationData.getLabelsAppliedToId(0)).to.deep.equal([]);
    expect(annotationData.isLabelOnId(0, 0)).toBe(false);
    expect(annotationData.getLabelsAppliedToId(1)).to.deep.equal([]);
    expect(annotationData.isLabelOnId(0, 1)).toBe(false);
  });

  it("can return mapping from time to labeled IDs", () => {
    const mockDataset = {
      times: [0, 1, 1, 2, 3, 4],
    };
    const annotationData = new AnnotationData();
    annotationData.createNewLabel();
    annotationData.setLabelValueOnIds(0, [0, 1, 2, 3, 4, 5], BOOLEAN_VALUE);

    annotationData.createNewLabel();
    annotationData.setLabelValueOnIds(1, [2], BOOLEAN_VALUE);

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

  describe("toCsv", () => {
    const mockDataset = {
      getTime: (id: number): number => [0, 1, 2, 3][id],
      getTrackId: (id: number) => [0, 1, 2, 3][id],
    } as unknown as Dataset;

    it("exports to CSV", () => {
      const annotationData = new AnnotationData();
      annotationData.createNewLabel({ name: "Label 1" });
      annotationData.createNewLabel({ name: "Label 2" });
      annotationData.createNewLabel({ name: "Label 3" });

      annotationData.setLabelValueOnIds(0, [0], BOOLEAN_VALUE);
      annotationData.setLabelValueOnIds(1, [1], BOOLEAN_VALUE);
      annotationData.setLabelValueOnIds(2, [2], BOOLEAN_VALUE);

      const csv = annotationData.toCsv(mockDataset);
      expect(csv).to.equal(
        `ID,Track,Frame,Label 1,Label 2,Label 3\r\n` +
          `0,0,0,${BOOLEAN_VALUE},,\r\n` +
          `1,1,1,,${BOOLEAN_VALUE},\r\n` +
          `2,2,2,,,${BOOLEAN_VALUE}`
      );
    });

    it("handles labels with quote and comma characters", () => {
      const annotationData = new AnnotationData();
      annotationData.createNewLabel({ name: '"label' });
      annotationData.createNewLabel({ name: ",,,,," });
      annotationData.createNewLabel({ name: 'a","fake label' });
      annotationData.createNewLabel({ name: '","' });

      annotationData.setLabelValueOnIds(0, [0], BOOLEAN_VALUE);
      annotationData.setLabelValueOnIds(1, [1], BOOLEAN_VALUE);
      annotationData.setLabelValueOnIds(2, [2], BOOLEAN_VALUE);
      annotationData.setLabelValueOnIds(3, [3], BOOLEAN_VALUE);

      const csv = annotationData.toCsv(mockDataset);

      // Check csv contents here.
      // Single quotes are escaped as double quotes.
      expect(csv).to.equal(
        `ID,Track,Frame,"""label",",,,,,","a"",""fake label",""","""\r\n` +
          `0,0,0,${BOOLEAN_VALUE},,,\r\n` +
          `1,1,1,,${BOOLEAN_VALUE},,\r\n` +
          `2,2,2,,,${BOOLEAN_VALUE},\r\n` +
          `3,3,3,,,,${BOOLEAN_VALUE}`
      );
    });

    it("trims column name whitespace on export", () => {
      const annotationData = new AnnotationData();
      annotationData.createNewLabel({ name: " \t Label 1" });
      annotationData.createNewLabel({ name: "\tLabel 2  " });
      annotationData.createNewLabel({ name: "\t\tLabel 3 \t " });

      const csv = annotationData.toCsv(mockDataset);
      expect(csv).to.equal(`ID,Track,Frame,Label 1,Label 2,Label 3\r\n`);
    });

    it("escapes column names starting with special characters", () => {
      // See https://owasp.org/www-community/attacks/CSV_Injection
      const annotationData = new AnnotationData();
      annotationData.createNewLabel({ name: "=SUM(A2:A5)" });
      annotationData.createNewLabel({ name: "@label" });
      annotationData.createNewLabel({ name: "+label" });
      annotationData.createNewLabel({ name: "-label" });
      annotationData.createNewLabel({ name: "\tlabel 1" });
      annotationData.createNewLabel({ name: "\rlabel 2" });

      const csv = annotationData.toCsv(mockDataset);
      expect(csv).to.equal(`ID,Track,Frame,"'=SUM(A2:A5)","'@label","'+label","'-label",label 1,label 2\r\n`);
    });
  });
});
