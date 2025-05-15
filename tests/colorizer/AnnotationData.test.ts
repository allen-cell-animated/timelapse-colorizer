import { Color } from "three";
import { describe, expect, it } from "vitest";

import { Dataset, DEFAULT_CATEGORICAL_PALETTE_KEY, KNOWN_CATEGORICAL_PALETTES } from "../../src/colorizer";
import { MOCK_DATASET } from "../state/ViewerState/constants";
import { compareRecord } from "../state/ViewerState/utils";

import { AnnotationData, BOOLEAN_VALUE_FALSE, BOOLEAN_VALUE_TRUE, LabelType } from "../../src/colorizer/AnnotationData";

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
    annotationData.setLabelValueOnIds(0, [0, 35, 458], BOOLEAN_VALUE_TRUE);
    annotationData.setLabelValueOnIds(1, [35], BOOLEAN_VALUE_TRUE);

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
    annotationData.setLabelValueOnIds(0, [0], BOOLEAN_VALUE_TRUE);
    annotationData.setLabelValueOnIds(0, [0], BOOLEAN_VALUE_TRUE);
    annotationData.setLabelValueOnIds(0, [1], BOOLEAN_VALUE_TRUE);

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
    annotationData.setLabelValueOnIds(0, [0, 1, 2, 3, 4, 5], BOOLEAN_VALUE_TRUE);

    annotationData.createNewLabel();
    annotationData.setLabelValueOnIds(1, [2], BOOLEAN_VALUE_TRUE);

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

  it("can assign and return label values", () => {
    const annotationData = new AnnotationData();
    annotationData.createNewLabel();
    annotationData.setLabelValueOnIds(0, [0, 1, 2], "A");
    annotationData.setLabelValueOnIds(0, [3, 4], "B");
    annotationData.setLabelValueOnIds(0, [5], "C");

    const labelData = annotationData.getLabels()[0];
    expect(labelData.valueToIds.get("A")).to.deep.equal(new Set([0, 1, 2]));
    expect(labelData.valueToIds.get("B")).to.deep.equal(new Set([3, 4]));
    expect(labelData.valueToIds.get("C")).to.deep.equal(new Set([5]));
    expect(labelData.ids).to.deep.equal(new Set([0, 1, 2, 3, 4, 5]));

    expect(annotationData.getValueFromId(0, 0)).to.equal("A");
    expect(annotationData.getValueFromId(0, 1)).to.equal("A");
    expect(annotationData.getValueFromId(0, 2)).to.equal("A");
    expect(annotationData.getValueFromId(0, 3)).to.equal("B");
    expect(annotationData.getValueFromId(0, 4)).to.equal("B");
    expect(annotationData.getValueFromId(0, 5)).to.equal("C");
  });

  it("can reassign values", () => {
    const annotationData = new AnnotationData();
    annotationData.createNewLabel();

    annotationData.setLabelValueOnIds(0, [1, 2], "A");
    annotationData.setLabelValueOnIds(0, [1], "B");
    annotationData.setLabelValueOnIds(0, [2, 3], "C");

    const labelData = annotationData.getLabels()[0];
    expect(labelData.ids).to.deep.equal(new Set([1, 2, 3]));
    expect(labelData.valueToIds.get("A")).toBeUndefined();
    expect(labelData.valueToIds.get("B")).to.deep.equal(new Set([1]));
    expect(labelData.valueToIds.get("C")).to.deep.equal(new Set([2, 3]));

    expect(annotationData.getValueFromId(0, 1)).to.equal("B");
    expect(annotationData.getValueFromId(0, 2)).to.equal("C");
    expect(annotationData.getValueFromId(0, 3)).to.equal("C");
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

      annotationData.setLabelValueOnIds(0, [0], BOOLEAN_VALUE_TRUE);
      annotationData.setLabelValueOnIds(1, [1], BOOLEAN_VALUE_TRUE);
      annotationData.setLabelValueOnIds(2, [2], BOOLEAN_VALUE_TRUE);

      const csv = annotationData.toCsv(mockDataset);
      const booleanTrue = BOOLEAN_VALUE_TRUE;
      const booleanFalse = BOOLEAN_VALUE_FALSE;
      expect(csv).to.equal(
        `ID,Track,Frame,Label 1,Label 2,Label 3\r\n` +
          `0,0,0,${booleanTrue},${booleanFalse},${booleanFalse}\r\n` +
          `1,1,1,${booleanFalse},${booleanTrue},${booleanFalse}\r\n` +
          `2,2,2,${booleanFalse},${booleanFalse},${booleanTrue}`
      );
    });

    it("exports different values to the CSV", () => {
      const annotationData = new AnnotationData();
      annotationData.createNewLabel({ name: "Label 1" });

      annotationData.setLabelValueOnIds(0, [0, 1], "A");
      annotationData.setLabelValueOnIds(0, [2], "B");
      annotationData.setLabelValueOnIds(0, [3], "C");

      const csv = annotationData.toCsv(mockDataset);
      expect(csv).to.equal(`ID,Track,Frame,Label 1\r\n` + `0,0,0,A\r\n` + `1,1,1,A\r\n` + `2,2,2,B\r\n` + `3,3,3,C`);
    });

    it("handles labels with quote and comma characters", () => {
      const annotationData = new AnnotationData();
      annotationData.createNewLabel({ name: '"label' });
      annotationData.createNewLabel({ name: ",,,,," });
      annotationData.createNewLabel({ name: 'a","fake label' });
      annotationData.createNewLabel({ name: '","' });

      annotationData.setLabelValueOnIds(0, [0], BOOLEAN_VALUE_TRUE);
      annotationData.setLabelValueOnIds(1, [1], BOOLEAN_VALUE_TRUE);
      annotationData.setLabelValueOnIds(2, [2], BOOLEAN_VALUE_TRUE);
      annotationData.setLabelValueOnIds(3, [3], BOOLEAN_VALUE_TRUE);

      const csv = annotationData.toCsv(mockDataset);

      // Check csv contents here.
      // Single quotes are escaped as double quotes.
      const booleanTrue = BOOLEAN_VALUE_TRUE;
      const booleanFalse = BOOLEAN_VALUE_FALSE;
      expect(csv).to.equal(
        `ID,Track,Frame,"""label",",,,,,","a"",""fake label",""","""\r\n` +
          `0,0,0,${booleanTrue},${booleanFalse},${booleanFalse},${booleanFalse}\r\n` +
          `1,1,1,${booleanFalse},${booleanTrue},${booleanFalse},${booleanFalse}\r\n` +
          `2,2,2,${booleanFalse},${booleanFalse},${booleanTrue},${booleanFalse}\r\n` +
          `3,3,3,${booleanFalse},${booleanFalse},${booleanFalse},${booleanTrue}`
      );
    });

    it("handles values with quote and comma characters", () => {
      const annotationData = new AnnotationData();
      annotationData.createNewLabel({ name: "Label 1" });

      annotationData.setLabelValueOnIds(0, [0], '"value"');
      annotationData.setLabelValueOnIds(0, [1], "value,value,value");
      annotationData.setLabelValueOnIds(0, [2], ",,,");

      const csv = annotationData.toCsv(mockDataset);
      expect(csv).to.equal(
        `ID,Track,Frame,Label 1\r\n` + `0,0,0,"""value"""\r\n` + `1,1,1,"value,value,value"\r\n` + `2,2,2,",,,"`
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

  describe("fromCsv", () => {
    const booleanLabelKey = "Boolean Label";
    const integerLabelKey = "Integer Label";
    const customLabelKey = "Custom Label";

    it("parses a basic CSV to an AnnotationData object", () => {
      const mockCsvHeaders = `ID,Track,Frame,${booleanLabelKey}\r\n`;
      const mockCsvData =
        `0,0,0,${BOOLEAN_VALUE_TRUE}\r\n` +
        `1,0,1,${BOOLEAN_VALUE_TRUE}\r\n` +
        `2,0,2,${BOOLEAN_VALUE_TRUE}\r\n` +
        `3,1,3,${BOOLEAN_VALUE_FALSE}\r\n`; // false values are omitted
      const mockCsv = mockCsvHeaders + mockCsvData;
      const annotationData = AnnotationData.fromCsv(MOCK_DATASET, mockCsv);

      const labels = annotationData.getLabels();
      const labelData = labels[0];
      expect(labels.length).toBe(1);
      expect(labelData.options.name).toBe(booleanLabelKey);
      expect(labelData.options.color).toEqual(defaultPalette.colors[0]);
      expect(labelData.options.type).toBe(LabelType.BOOLEAN);

      // Check IDs and values
      expect(labelData.ids).toEqual(new Set([0, 1, 2]));
      expect(labelData.valueToIds.get(BOOLEAN_VALUE_TRUE)).toEqual(new Set([0, 1, 2]));
      expect(labelData.idToValue.get(0)).toEqual(BOOLEAN_VALUE_TRUE);
      expect(labelData.idToValue.get(1)).toEqual(BOOLEAN_VALUE_TRUE);
      expect(labelData.idToValue.get(2)).toEqual(BOOLEAN_VALUE_TRUE);
    });

    it("determines and parses multiple labels", () => {
      const mockCsvHeaders = `ID,Track,Frame,${booleanLabelKey},${integerLabelKey},${customLabelKey}\r\n`;
      const mockCsvData =
        `0,0,0,${BOOLEAN_VALUE_TRUE},1,"A"\r\n` +
        `1,0,1,${BOOLEAN_VALUE_TRUE},2,"B"\r\n` +
        `2,0,2,${BOOLEAN_VALUE_TRUE},3,"C"\r\n` +
        `7,2,7,${BOOLEAN_VALUE_TRUE},4,"D"\r\n`;
      const mockCsv = mockCsvHeaders + mockCsvData;
      const annotationData = AnnotationData.fromCsv(MOCK_DATASET, mockCsv);

      const labels = annotationData.getLabels();
      expect(labels.length).toBe(3);
      expect(labels[0].options.name).toBe(booleanLabelKey);
      expect(labels[0].options.type).toBe(LabelType.BOOLEAN);
      expect(labels[1].options.name).toBe(integerLabelKey);
      expect(labels[1].options.type).toBe(LabelType.INTEGER);
      expect(labels[2].options.name).toBe(customLabelKey);
      expect(labels[2].options.type).toBe(LabelType.CUSTOM);

      // Check ID + value to ID mappings
      expect(labels[0].ids).toEqual(new Set([0, 1, 2, 7]));
      expect(labels[0].valueToIds.get(BOOLEAN_VALUE_TRUE)).toEqual(new Set([0, 1, 2, 7]));

      expect(labels[1].ids).toEqual(new Set([0, 1, 2, 7]));
      expect(labels[1].valueToIds).to.deep.equal(
        new Map([
          ["1", new Set([0])],
          ["2", new Set([1])],
          ["3", new Set([2])],
          ["4", new Set([7])],
        ])
      );
      expect(labels[1].idToValue).to.deep.equal(
        new Map([
          [0, "1"],
          [1, "2"],
          [2, "3"],
          [7, "4"],
        ])
      );

      expect(labels[2].ids).toEqual(new Set([0, 1, 2, 7]));
      expect(labels[2].valueToIds).to.deep.equal(
        new Map([
          ["A", new Set([0])],
          ["B", new Set([1])],
          ["C", new Set([2])],
          ["D", new Set([7])],
        ])
      );
      expect(labels[2].idToValue).to.deep.equal(
        new Map([
          [0, "A"],
          [1, "B"],
          [2, "C"],
          [7, "D"],
        ])
      );
    });

    it("handles empty/missing/falsy lines", () => {
      const mockCsvHeaders = `ID,Track,Frame,${booleanLabelKey},${integerLabelKey},${customLabelKey}\r\n`;
      const mockCsvData =
        `0,0,0,${BOOLEAN_VALUE_TRUE} , ,"A"\r\n` +
        `1,0,1,${BOOLEAN_VALUE_FALSE},2,""\r\n` +
        `2,0,2,                      ,3,"C"\r\n` +
        `7,2,7,${BOOLEAN_VALUE_TRUE} ,4,\r\n`;
      const mockCsv = mockCsvHeaders + mockCsvData;
      const annotationData = AnnotationData.fromCsv(MOCK_DATASET, mockCsv);

      const labels = annotationData.getLabels();
      expect(labels.length).toBe(3);
      expect(labels[0].options.name).toBe(booleanLabelKey);
      expect(labels[0].options.type).toBe(LabelType.BOOLEAN);
      expect(labels[1].options.name).toBe(integerLabelKey);
      expect(labels[1].options.type).toBe(LabelType.INTEGER);
      expect(labels[2].options.name).toBe(customLabelKey);
      expect(labels[2].options.type).toBe(LabelType.CUSTOM);

      // Check ID + value to ID mappings
      expect(labels[0].ids).toEqual(new Set([0, 7]));
      expect(labels[0].valueToIds.get(BOOLEAN_VALUE_TRUE)).toEqual(new Set([0, 7]));

      expect(labels[1].ids).toEqual(new Set([1, 2, 7]));
      expect(labels[1].valueToIds).to.deep.equal(
        new Map([
          ["2", new Set([1])],
          ["3", new Set([2])],
          ["4", new Set([7])],
        ])
      );
      expect(labels[1].idToValue).to.deep.equal(
        new Map([
          [1, "2"],
          [2, "3"],
          [7, "4"],
        ])
      );

      expect(labels[2].ids).toEqual(new Set([0, 2]));
      expect(labels[2].valueToIds).to.deep.equal(
        new Map([
          ["A", new Set([0])],
          ["C", new Set([2])],
        ])
      );
      expect(labels[2].idToValue).to.deep.equal(
        new Map([
          [0, "A"],
          [2, "C"],
        ])
      );
    });

    it("handles mixed boolean capitalization", () => {
      const mockCsvHeaders = `ID,Track,Frame,${booleanLabelKey}\r\n`;
      const mockCsvData =
        `0,0,0,true\r\n` +
        `1,0,1,True\r\n` +
        `2,0,2,TRUE\r\n` +
        `3,1,3,false\r\n` +
        `4,1,4,False\r\n` +
        `5,1,5,FALSE\r\n`;
      const mockCsv = mockCsvHeaders + mockCsvData;
      const annotationData = AnnotationData.fromCsv(MOCK_DATASET, mockCsv);
      const labels = annotationData.getLabels();
      expect(labels.length).toBe(1);
      expect(labels[0].options.name).toBe(booleanLabelKey);
      expect(labels[0].options.type).toBe(LabelType.BOOLEAN);
      expect(labels[0].ids).toEqual(new Set([0, 1, 2]));
      expect(labels[0].valueToIds.get(BOOLEAN_VALUE_TRUE)).toEqual(new Set([0, 1, 2]));
    });
  });
});
