import { Color } from "three";
import { describe, expect, it } from "vitest";

import { type Dataset, DEFAULT_CATEGORICAL_PALETTE_KEY, KNOWN_CATEGORICAL_PALETTES } from "src/colorizer";
import {
  AnnotationData,
  AnnotationMergeMode,
  BOOLEAN_VALUE_FALSE,
  BOOLEAN_VALUE_TRUE,
  LabelType,
} from "src/colorizer/AnnotationData";
import { MOCK_DATASET, MOCK_DATASET_KEY } from "tests/constants";
import { compareRecord } from "tests/state/ViewerState/utils";

const BOOLEAN_LABEL_KEY = "Boolean Label";
const INTEGER_LABEL_KEY = "Integer Label";
const CUSTOM_LABEL_KEY = "Custom Label";

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
    compareRecord(labels[0].options, { name: "Annotation 1", color: defaultPalette.colors[0] });
    compareRecord(labels[1].options, { name: "Annotation 2", color: defaultPalette.colors[1] });
    compareRecord(labels[2].options, { name: "Annotation 3", color: defaultPalette.colors[2] });
  });

  it("allows updating of label names and colors", () => {
    const annotationData = new AnnotationData();
    annotationData.createNewLabel();
    annotationData.createNewLabel();
    annotationData.createNewLabel();

    annotationData.setLabelOptions(0, { name: "New Annotation Name" });
    annotationData.setLabelOptions(1, { color: new Color("#FF0000") });
    annotationData.setLabelOptions(2, { name: "Another New Annotation Name", color: new Color("#00FF00") });

    const labels = annotationData.getLabels();
    expect(labels.length).toBe(3);
    compareRecord(labels[0].options, { name: "New Annotation Name", color: defaultPalette.colors[0] });
    compareRecord(labels[1].options, { name: "Annotation 2", color: new Color("#FF0000") });
    compareRecord(labels[2].options, { name: "Another New Annotation Name", color: new Color("#00FF00") });
  });

  it("deletes labels", () => {
    const annotationData = new AnnotationData();
    annotationData.createNewLabel();
    annotationData.createNewLabel();
    annotationData.createNewLabel();

    annotationData.deleteLabel(1);
    let labels = annotationData.getLabels();
    expect(labels.length).toBe(2);
    compareRecord(labels[0].options, { name: "Annotation 1", color: defaultPalette.colors[0] });
    compareRecord(labels[1].options, { name: "Annotation 3", color: defaultPalette.colors[2] });

    // Creating new label should reuse deleted index and increment name by 1
    annotationData.createNewLabel();
    labels = annotationData.getLabels();
    expect(labels.length).toBe(3);
    compareRecord(labels[0].options, { name: "Annotation 1", color: defaultPalette.colors[0] });
    compareRecord(labels[1].options, { name: "Annotation 3", color: defaultPalette.colors[2] });
    compareRecord(labels[2].options, { name: "Annotation 4", color: defaultPalette.colors[3] });
  });

  it("can apply and remove labels from an ID", () => {
    const annotationData = new AnnotationData();
    annotationData.createNewLabel();
    annotationData.createNewLabel();
    annotationData.setLabelValueOnIds(MOCK_DATASET_KEY, MOCK_DATASET, 0, [0, 35, 458], BOOLEAN_VALUE_TRUE);
    annotationData.setLabelValueOnIds(MOCK_DATASET_KEY, MOCK_DATASET, 1, [35], BOOLEAN_VALUE_TRUE);

    expect(annotationData.getLabelsAppliedToId(MOCK_DATASET_KEY, 0)).to.deep.equal([0]);
    expect(annotationData.getLabelsAppliedToId(MOCK_DATASET_KEY, 35)).to.deep.equal([0, 1]);
    expect(annotationData.getLabelsAppliedToId(MOCK_DATASET_KEY, 458)).to.deep.equal([0]);

    annotationData.removeLabelOnIds(MOCK_DATASET_KEY, 0, [35]);
    expect(annotationData.getLabelsAppliedToId(MOCK_DATASET_KEY, 0)).to.deep.equal([0]);
    expect(annotationData.getLabelsAppliedToId(MOCK_DATASET_KEY, 35)).to.deep.equal([1]);
    expect(annotationData.getLabelsAppliedToId(MOCK_DATASET_KEY, 458)).to.deep.equal([0]);
  });

  it("stores IDs independently per dataset", () => {
    const annotationData = new AnnotationData();
    annotationData.createNewLabel();
    annotationData.setLabelValueOnIds("dataset_1", MOCK_DATASET, 0, [0, 35, 458], BOOLEAN_VALUE_TRUE);
    annotationData.setLabelValueOnIds("dataset_2", MOCK_DATASET, 0, [35, 85], BOOLEAN_VALUE_TRUE);

    expect(annotationData.getLabelsAppliedToId("dataset_1", 0)).to.deep.equal([0]);
    expect(annotationData.getLabelsAppliedToId("dataset_1", 35)).to.deep.equal([0]);
    expect(annotationData.getLabelsAppliedToId("dataset_1", 458)).to.deep.equal([0]);

    expect(annotationData.getLabelsAppliedToId("dataset_2", 35)).to.deep.equal([0]);
    expect(annotationData.getLabelsAppliedToId("dataset_2", 85)).to.deep.equal([0]);

    expect(annotationData.getLabelsAppliedToId("dataset_2", 0)).to.deep.equal([]);
  });

  it("ignores duplicate calls to setLabelOnIds", () => {
    const annotationData = new AnnotationData();
    annotationData.createNewLabel();
    annotationData.createNewLabel();
    annotationData.setLabelValueOnIds(MOCK_DATASET_KEY, MOCK_DATASET, 0, [0], BOOLEAN_VALUE_TRUE);
    annotationData.setLabelValueOnIds(MOCK_DATASET_KEY, MOCK_DATASET, 0, [0], BOOLEAN_VALUE_TRUE);
    annotationData.setLabelValueOnIds(MOCK_DATASET_KEY, MOCK_DATASET, 0, [1], BOOLEAN_VALUE_TRUE);

    expect(annotationData.getLabelsAppliedToId(MOCK_DATASET_KEY, 0)).to.deep.equal([0]);
    expect(annotationData.isLabelOnId(MOCK_DATASET_KEY, 0, 0)).toBe(true);
    expect(annotationData.getLabelsAppliedToId(MOCK_DATASET_KEY, 1)).to.deep.equal([0]);
    expect(annotationData.isLabelOnId(MOCK_DATASET_KEY, 0, 1)).toBe(true);

    annotationData.removeLabelOnIds(MOCK_DATASET_KEY, 0, [0]);
    annotationData.removeLabelOnIds(MOCK_DATASET_KEY, 0, [0]);
    annotationData.removeLabelOnIds(MOCK_DATASET_KEY, 0, [1]);

    expect(annotationData.getLabelsAppliedToId(MOCK_DATASET_KEY, 0)).to.deep.equal([]);
    expect(annotationData.isLabelOnId(MOCK_DATASET_KEY, 0, 0)).toBe(false);
    expect(annotationData.getLabelsAppliedToId(MOCK_DATASET_KEY, 1)).to.deep.equal([]);
    expect(annotationData.isLabelOnId(MOCK_DATASET_KEY, 0, 1)).toBe(false);
  });

  it("can return mapping from time to labeled IDs", () => {
    const mockDataset = {
      times: [0, 1, 1, 2, 3, 4],
    };
    const annotationData = new AnnotationData();
    annotationData.createNewLabel();
    annotationData.setLabelValueOnIds(MOCK_DATASET_KEY, MOCK_DATASET, 0, [0, 1, 2, 3, 4, 5], BOOLEAN_VALUE_TRUE);

    annotationData.createNewLabel();
    annotationData.setLabelValueOnIds(MOCK_DATASET_KEY, MOCK_DATASET, 1, [2], BOOLEAN_VALUE_TRUE);

    /* eslint-disable @typescript-eslint/naming-convention */
    // ESLint doesn't like "0" and "1" being property keys.
    expect(annotationData.getTimeToLabelIdMap(MOCK_DATASET_KEY, mockDataset as unknown as Dataset)).to.deep.equal(
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
    annotationData.setLabelValueOnIds(MOCK_DATASET_KEY, MOCK_DATASET, 0, [0, 1, 2], "A");
    annotationData.setLabelValueOnIds(MOCK_DATASET_KEY, MOCK_DATASET, 0, [3, 4], "B");
    annotationData.setLabelValueOnIds(MOCK_DATASET_KEY, MOCK_DATASET, 0, [5], "C");

    const labelData = annotationData.getLabels()[0];
    expect(labelData.datasetToIdData.get(MOCK_DATASET_KEY)!.valueToIds.get("A")).to.deep.equal(new Set([0, 1, 2]));
    expect(labelData.datasetToIdData.get(MOCK_DATASET_KEY)!.valueToIds.get("B")).to.deep.equal(new Set([3, 4]));
    expect(labelData.datasetToIdData.get(MOCK_DATASET_KEY)!.valueToIds.get("C")).to.deep.equal(new Set([5]));
    expect(labelData.datasetToIdData.get(MOCK_DATASET_KEY)!.ids).to.deep.equal(new Set([0, 1, 2, 3, 4, 5]));

    expect(annotationData.getValueFromId(MOCK_DATASET_KEY, 0, 0)).to.equal("A");
    expect(annotationData.getValueFromId(MOCK_DATASET_KEY, 0, 1)).to.equal("A");
    expect(annotationData.getValueFromId(MOCK_DATASET_KEY, 0, 2)).to.equal("A");
    expect(annotationData.getValueFromId(MOCK_DATASET_KEY, 0, 3)).to.equal("B");
    expect(annotationData.getValueFromId(MOCK_DATASET_KEY, 0, 4)).to.equal("B");
    expect(annotationData.getValueFromId(MOCK_DATASET_KEY, 0, 5)).to.equal("C");
  });

  it("can reassign values", () => {
    const annotationData = new AnnotationData();
    annotationData.createNewLabel();

    annotationData.setLabelValueOnIds(MOCK_DATASET_KEY, MOCK_DATASET, 0, [1, 2], "A");
    annotationData.setLabelValueOnIds(MOCK_DATASET_KEY, MOCK_DATASET, 0, [1], "B");
    annotationData.setLabelValueOnIds(MOCK_DATASET_KEY, MOCK_DATASET, 0, [2, 3], "C");

    const labelData = annotationData.getLabels()[0];
    expect(labelData.datasetToIdData.get(MOCK_DATASET_KEY)!.ids).to.deep.equal(new Set([1, 2, 3]));
    expect(labelData.datasetToIdData.get(MOCK_DATASET_KEY)!.valueToIds.get("A")).toBeUndefined();
    expect(labelData.datasetToIdData.get(MOCK_DATASET_KEY)!.valueToIds.get("B")).to.deep.equal(new Set([1]));
    expect(labelData.datasetToIdData.get(MOCK_DATASET_KEY)!.valueToIds.get("C")).to.deep.equal(new Set([2, 3]));

    expect(annotationData.getValueFromId(MOCK_DATASET_KEY, 0, 1)).to.equal("B");
    expect(annotationData.getValueFromId(MOCK_DATASET_KEY, 0, 2)).to.equal("C");
    expect(annotationData.getValueFromId(MOCK_DATASET_KEY, 0, 3)).to.equal("C");
  });

  const mockDataset = {
    getTime: (id: number): number => [0, 1, 2, 3][id],
    getSegmentationId: (id: number): number => [0, 1, 2, 3][id],
    getTrackId: (id: number) => [0, 1, 2, 3][id],
  } as unknown as Dataset;

  describe("toCsv", () => {
    it("exports to CSV", () => {
      const annotationData = new AnnotationData();
      annotationData.createNewLabel({ name: "Label 1" });
      annotationData.createNewLabel({ name: "Label 2" });
      annotationData.createNewLabel({ name: "Label 3" });

      annotationData.setLabelValueOnIds(MOCK_DATASET_KEY, mockDataset, 0, [0], BOOLEAN_VALUE_TRUE);
      annotationData.setLabelValueOnIds(MOCK_DATASET_KEY, mockDataset, 1, [1], BOOLEAN_VALUE_TRUE);
      annotationData.setLabelValueOnIds(MOCK_DATASET_KEY, mockDataset, 2, [2], BOOLEAN_VALUE_TRUE);

      const csv = annotationData.toCsv();
      const booleanTrue = BOOLEAN_VALUE_TRUE;
      const booleanFalse = BOOLEAN_VALUE_FALSE;
      expect(csv).to.equal(
        `Dataset,ID,Label,Track,Frame,Label 1,Label 2,Label 3\r\n` +
          `${MOCK_DATASET_KEY},0,0,0,0,${booleanTrue},${booleanFalse},${booleanFalse}\r\n` +
          `${MOCK_DATASET_KEY},1,1,1,1,${booleanFalse},${booleanTrue},${booleanFalse}\r\n` +
          `${MOCK_DATASET_KEY},2,2,2,2,${booleanFalse},${booleanFalse},${booleanTrue}`
      );
    });

    it("exports different values to the CSV", () => {
      const annotationData = new AnnotationData();
      annotationData.createNewLabel({ name: "Label 1" });

      annotationData.setLabelValueOnIds(MOCK_DATASET_KEY, mockDataset, 0, [0, 1], "A");
      annotationData.setLabelValueOnIds(MOCK_DATASET_KEY, mockDataset, 0, [2], "B");
      annotationData.setLabelValueOnIds(MOCK_DATASET_KEY, mockDataset, 0, [3], "C");

      const csv = annotationData.toCsv();
      expect(csv).to.equal(
        `Dataset,ID,Label,Track,Frame,Label 1\r\n` +
          `${MOCK_DATASET_KEY},0,0,0,0,A\r\n` +
          `${MOCK_DATASET_KEY},1,1,1,1,A\r\n` +
          `${MOCK_DATASET_KEY},2,2,2,2,B\r\n` +
          `${MOCK_DATASET_KEY},3,3,3,3,C`
      );
    });

    it("handles labels with quote and comma characters", () => {
      const annotationData = new AnnotationData();
      annotationData.createNewLabel({ name: '"label' });
      annotationData.createNewLabel({ name: ",,,,," });
      annotationData.createNewLabel({ name: 'a","fake label' });
      annotationData.createNewLabel({ name: '","' });

      annotationData.setLabelValueOnIds(MOCK_DATASET_KEY, mockDataset, 0, [0], BOOLEAN_VALUE_TRUE);
      annotationData.setLabelValueOnIds(MOCK_DATASET_KEY, mockDataset, 1, [1], BOOLEAN_VALUE_TRUE);
      annotationData.setLabelValueOnIds(MOCK_DATASET_KEY, mockDataset, 2, [2], BOOLEAN_VALUE_TRUE);
      annotationData.setLabelValueOnIds(MOCK_DATASET_KEY, mockDataset, 3, [3], BOOLEAN_VALUE_TRUE);

      const csv = annotationData.toCsv();

      // Check csv contents here.
      // Single quotes are escaped as double quotes.
      const booleanTrue = BOOLEAN_VALUE_TRUE;
      const booleanFalse = BOOLEAN_VALUE_FALSE;
      expect(csv).to.equal(
        `Dataset,ID,Label,Track,Frame,"""label",",,,,,","a"",""fake label",""","""\r\n` +
          `${MOCK_DATASET_KEY},0,0,0,0,${booleanTrue},${booleanFalse},${booleanFalse},${booleanFalse}\r\n` +
          `${MOCK_DATASET_KEY},1,1,1,1,${booleanFalse},${booleanTrue},${booleanFalse},${booleanFalse}\r\n` +
          `${MOCK_DATASET_KEY},2,2,2,2,${booleanFalse},${booleanFalse},${booleanTrue},${booleanFalse}\r\n` +
          `${MOCK_DATASET_KEY},3,3,3,3,${booleanFalse},${booleanFalse},${booleanFalse},${booleanTrue}`
      );
    });

    it("handles values with quote and comma characters", () => {
      const annotationData = new AnnotationData();
      annotationData.createNewLabel({ name: "Label 1" });

      annotationData.setLabelValueOnIds(MOCK_DATASET_KEY, mockDataset, 0, [0], '"value"');
      annotationData.setLabelValueOnIds(MOCK_DATASET_KEY, mockDataset, 0, [1], "value,value,value");
      annotationData.setLabelValueOnIds(MOCK_DATASET_KEY, mockDataset, 0, [2], ",,,");

      const csv = annotationData.toCsv();
      expect(csv).to.equal(
        `Dataset,ID,Label,Track,Frame,Label 1\r\n` +
          `${MOCK_DATASET_KEY},0,0,0,0,"""value"""\r\n` +
          `${MOCK_DATASET_KEY},1,1,1,1,"value,value,value"\r\n` +
          `${MOCK_DATASET_KEY},2,2,2,2,",,,"`
      );
    });

    it("trims column name whitespace on export", () => {
      const annotationData = new AnnotationData();
      annotationData.createNewLabel({ name: " \t Label 1" });
      annotationData.createNewLabel({ name: "\tLabel 2  " });
      annotationData.createNewLabel({ name: "\t\tLabel 3 \t " });

      const csv = annotationData.toCsv();
      expect(csv).to.equal(`Dataset,ID,Label,Track,Frame,Label 1,Label 2,Label 3\r\n`);
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

      const csv = annotationData.toCsv();
      expect(csv).to.equal(
        `Dataset,ID,Label,Track,Frame,"'=SUM(A2:A5)","'@label","'+label","'-label",label 1,label 2\r\n`
      );
    });

    it("includes annotations from all dataset keys", () => {
      const annotationData = new AnnotationData();
      annotationData.createNewLabel({ name: "Label 1" });
      annotationData.createNewLabel({ name: "Label 2", type: LabelType.CUSTOM });

      annotationData.setLabelValueOnIds("dataset_1", mockDataset, 0, [0], BOOLEAN_VALUE_TRUE);
      annotationData.setLabelValueOnIds("dataset_2", mockDataset, 1, [1], "yahaha");
      annotationData.setLabelValueOnIds("dataset_2", mockDataset, 1, [2], "yahaha");

      const csv = annotationData.toCsv();
      const booleanTrue = BOOLEAN_VALUE_TRUE;
      const booleanFalse = BOOLEAN_VALUE_FALSE;
      expect(csv).to.equal(
        `Dataset,ID,Label,Track,Frame,Label 1,Label 2\r\n` +
          `dataset_1,0,0,0,0,${booleanTrue},\r\n` +
          `dataset_2,1,1,1,1,${booleanFalse},yahaha\r\n` +
          `dataset_2,2,2,2,2,${booleanFalse},yahaha`
      );
    });
  });

  describe("fromCsv", () => {
    it("parses a basic CSV to an AnnotationData object", () => {
      const mockCsvHeaders = `ID,Track,Frame,${BOOLEAN_LABEL_KEY}\r\n`;
      const mockCsvData =
        `0,0,0,${BOOLEAN_VALUE_TRUE}\r\n` +
        `1,0,1,${BOOLEAN_VALUE_TRUE}\r\n` +
        `2,0,2,${BOOLEAN_VALUE_TRUE}\r\n` +
        `3,1,3,${BOOLEAN_VALUE_FALSE}\r\n`; // false values are omitted
      const mockCsv = mockCsvHeaders + mockCsvData;
      const result = AnnotationData.fromCsv(MOCK_DATASET_KEY, MOCK_DATASET, mockCsv);
      const annotationData = result.annotationData;

      const labels = annotationData.getLabels();
      const labelData = labels[0];
      expect(labels.length).toBe(1);
      expect(labelData.options.name).toBe(BOOLEAN_LABEL_KEY);
      expect(labelData.options.color).toEqual(defaultPalette.colors[0]);
      expect(labelData.options.type).toBe(LabelType.BOOLEAN);

      // Check IDs and values
      expect(labelData.datasetToIdData.get(MOCK_DATASET_KEY)!.ids).toEqual(new Set([0, 1, 2]));
      expect(labelData.datasetToIdData.get(MOCK_DATASET_KEY)!.valueToIds.get(BOOLEAN_VALUE_TRUE)).toEqual(
        new Set([0, 1, 2])
      );
      expect(labelData.datasetToIdData.get(MOCK_DATASET_KEY)!.idToValue.get(0)).toEqual(BOOLEAN_VALUE_TRUE);
      expect(labelData.datasetToIdData.get(MOCK_DATASET_KEY)!.idToValue.get(1)).toEqual(BOOLEAN_VALUE_TRUE);
      expect(labelData.datasetToIdData.get(MOCK_DATASET_KEY)!.idToValue.get(2)).toEqual(BOOLEAN_VALUE_TRUE);
    });

    it("handles dataset column", () => {
      const datasetKey1 = "dataset_1";
      const datasetKey2 = "dataset_2";
      const mockCsvHeaders = `Dataset,ID,Track,Frame,${BOOLEAN_LABEL_KEY}\r\n`;
      const mockCsvData =
        `${datasetKey1},0,0,0,${BOOLEAN_VALUE_TRUE}\r\n` +
        `${datasetKey1},1,0,1,${BOOLEAN_VALUE_TRUE}\r\n` +
        `${datasetKey1},2,0,2,${BOOLEAN_VALUE_TRUE}\r\n` +
        `${datasetKey1},3,1,3,${BOOLEAN_VALUE_FALSE}\r\n` +
        `${datasetKey2},4,2,0,${BOOLEAN_VALUE_TRUE}\r\n` +
        `${datasetKey2},5,2,1,${BOOLEAN_VALUE_FALSE}\r\n` +
        `${datasetKey2},6,2,2,${BOOLEAN_VALUE_TRUE}\r\n`;

      const mockCsv = mockCsvHeaders + mockCsvData;
      const result = AnnotationData.fromCsv(MOCK_DATASET_KEY, MOCK_DATASET, mockCsv);
      const annotationData = result.annotationData;
      const labels = annotationData.getLabels();
      expect(labels.length).toBe(1);
      expect(annotationData.isLabelOnId(datasetKey1, 0, 0)).toBe(true);
      expect(annotationData.isLabelOnId(datasetKey1, 0, 1)).toBe(true);
      expect(annotationData.isLabelOnId(datasetKey1, 0, 2)).toBe(true);
      expect(annotationData.isLabelOnId(datasetKey1, 0, 3)).toBe(false);
      expect(annotationData.isLabelOnId(datasetKey2, 0, 4)).toBe(true);
      expect(annotationData.isLabelOnId(datasetKey2, 0, 5)).toBe(false);
      expect(annotationData.isLabelOnId(datasetKey2, 0, 6)).toBe(true);
      expect(labels[0].datasetToIdData.get(datasetKey1)!.ids).toEqual(new Set([0, 1, 2]));
      expect(labels[0].datasetToIdData.get(datasetKey2)!.ids).toEqual(new Set([4, 6]));
    });

    it("falls back to provided dataset key when Dataset column is empty", () => {
      const datasetKey1 = "dataset_1";
      const datasetKey2 = "dataset_2";
      const mockCsvHeaders = `Dataset,ID,Track,Frame,${BOOLEAN_LABEL_KEY}\r\n`;
      const mockCsvData =
        `,0,0,0,${BOOLEAN_VALUE_TRUE}\r\n` +
        `${datasetKey2},1,0,1,${BOOLEAN_VALUE_TRUE}\r\n` +
        `,2,0,2,${BOOLEAN_VALUE_FALSE}\r\n`;

      const result = AnnotationData.fromCsv(datasetKey1, mockDataset, mockCsvHeaders + mockCsvData);

      expect(result.unvalidatedIds).toEqual(1);
      expect(result.annotationData.isLabelOnId(datasetKey1, 0, 0)).toBe(true);
      expect(result.annotationData.isLabelOnId(datasetKey1, 0, 1)).toBe(false);
      expect(result.annotationData.isLabelOnId(datasetKey1, 0, 2)).toBe(false);
      expect(result.annotationData.isLabelOnId(datasetKey2, 0, 1)).toBe(true);
    });

    it("validates track and frame for the provided dataset", () => {
      const datasetKey1 = "dataset_1";
      const datasetKey2 = "dataset_2";
      const mockCsvHeaders = `Dataset,ID,Track,Frame,${BOOLEAN_LABEL_KEY}\r\n`;
      const mockCsvData =
        `${datasetKey1},0,0,0,${BOOLEAN_VALUE_TRUE}\r\n` + // valid
        `${datasetKey2},not_a_number,not_a_number,not_a_number,${BOOLEAN_VALUE_TRUE}\r\n` + // unparseable
        `${datasetKey1},2,999,999,${BOOLEAN_VALUE_TRUE}\r\n` + // mismatched
        `${datasetKey2},3,0,1,${BOOLEAN_VALUE_TRUE}\r\n`; // valid but not validated

      const result = AnnotationData.fromCsv(datasetKey1, MOCK_DATASET, mockCsvHeaders + mockCsvData);

      expect(result.mismatchedTracks).toEqual(1);
      expect(result.mismatchedTimes).toEqual(1);
      expect(result.unparseableRows).toEqual(1);
      expect(result.unvalidatedIds).toEqual(1);
      expect(result.annotationData.isLabelOnId(datasetKey1, 0, 0)).toBe(true);
      expect(result.annotationData.isLabelOnId(datasetKey2, 0, 1)).toBe(false);
      expect(result.annotationData.isLabelOnId(datasetKey1, 0, 2)).toBe(true);
      expect(result.annotationData.isLabelOnId(datasetKey2, 0, 3)).toBe(true);
    });

    it("determines and parses multiple labels", () => {
      const mockCsvHeaders = `ID,Track,Frame,${BOOLEAN_LABEL_KEY},${INTEGER_LABEL_KEY},${CUSTOM_LABEL_KEY}\r\n`;
      const mockCsvData =
        `0,0,0,${BOOLEAN_VALUE_TRUE},1,"A"\r\n` +
        `1,0,1,${BOOLEAN_VALUE_TRUE},2,"B"\r\n` +
        `2,0,2,${BOOLEAN_VALUE_TRUE},3,"C"\r\n` +
        `7,2,7,${BOOLEAN_VALUE_TRUE},4,"D"\r\n`;
      const mockCsv = mockCsvHeaders + mockCsvData;
      const result = AnnotationData.fromCsv(MOCK_DATASET_KEY, MOCK_DATASET, mockCsv);
      const annotationData = result.annotationData;

      const labels = annotationData.getLabels();
      expect(labels.length).toBe(3);
      expect(labels[0].options.name).toBe(BOOLEAN_LABEL_KEY);
      expect(labels[0].options.type).toBe(LabelType.BOOLEAN);
      expect(labels[1].options.name).toBe(INTEGER_LABEL_KEY);
      expect(labels[1].options.type).toBe(LabelType.INTEGER);
      expect(labels[2].options.name).toBe(CUSTOM_LABEL_KEY);
      expect(labels[2].options.type).toBe(LabelType.CUSTOM);

      // Check ID + value to ID mappings
      expect(labels[0].datasetToIdData.get(MOCK_DATASET_KEY)!.ids).toEqual(new Set([0, 1, 2, 7]));
      expect(labels[0].datasetToIdData.get(MOCK_DATASET_KEY)!.valueToIds.get(BOOLEAN_VALUE_TRUE)).toEqual(
        new Set([0, 1, 2, 7])
      );

      expect(labels[1].datasetToIdData.get(MOCK_DATASET_KEY)!.ids).toEqual(new Set([0, 1, 2, 7]));
      expect(labels[1].datasetToIdData.get(MOCK_DATASET_KEY)!.valueToIds).to.deep.equal(
        new Map([
          ["1", new Set([0])],
          ["2", new Set([1])],
          ["3", new Set([2])],
          ["4", new Set([7])],
        ])
      );
      expect(labels[1].datasetToIdData.get(MOCK_DATASET_KEY)!.idToValue).to.deep.equal(
        new Map([
          [0, "1"],
          [1, "2"],
          [2, "3"],
          [7, "4"],
        ])
      );

      expect(labels[2].datasetToIdData.get(MOCK_DATASET_KEY)!.ids).toEqual(new Set([0, 1, 2, 7]));
      expect(labels[2].datasetToIdData.get(MOCK_DATASET_KEY)!.valueToIds).to.deep.equal(
        new Map([
          ["A", new Set([0])],
          ["B", new Set([1])],
          ["C", new Set([2])],
          ["D", new Set([7])],
        ])
      );
      expect(labels[2].datasetToIdData.get(MOCK_DATASET_KEY)!.idToValue).to.deep.equal(
        new Map([
          [0, "A"],
          [1, "B"],
          [2, "C"],
          [7, "D"],
        ])
      );
    });

    it("handles empty/missing/falsy lines", () => {
      const mockCsvHeaders = `ID,Track,Frame,${BOOLEAN_LABEL_KEY},${INTEGER_LABEL_KEY},${CUSTOM_LABEL_KEY}\r\n`;
      const mockCsvData =
        `0,0,0,${BOOLEAN_VALUE_TRUE} , ,"A"\r\n` +
        `1,0,1,${BOOLEAN_VALUE_FALSE},2,""\r\n` +
        `2,0,2,                      ,3,"C"\r\n` +
        `7,2,7,${BOOLEAN_VALUE_TRUE} ,4,\r\n`;
      const mockCsv = mockCsvHeaders + mockCsvData;
      const result = AnnotationData.fromCsv(MOCK_DATASET_KEY, MOCK_DATASET, mockCsv);
      const annotationData = result.annotationData;

      const labels = annotationData.getLabels();
      expect(labels.length).toBe(3);
      expect(labels[0].options.name).toBe(BOOLEAN_LABEL_KEY);
      expect(labels[0].options.type).toBe(LabelType.BOOLEAN);
      expect(labels[1].options.name).toBe(INTEGER_LABEL_KEY);
      expect(labels[1].options.type).toBe(LabelType.INTEGER);
      expect(labels[2].options.name).toBe(CUSTOM_LABEL_KEY);
      expect(labels[2].options.type).toBe(LabelType.CUSTOM);

      // Check ID + value to ID mappings
      expect(labels[0].datasetToIdData.get(MOCK_DATASET_KEY)!.ids).toEqual(new Set([0, 7]));
      expect(labels[0].datasetToIdData.get(MOCK_DATASET_KEY)!.valueToIds.get(BOOLEAN_VALUE_TRUE)).toEqual(
        new Set([0, 7])
      );

      expect(labels[1].datasetToIdData.get(MOCK_DATASET_KEY)!.ids).toEqual(new Set([1, 2, 7]));
      expect(labels[1].datasetToIdData.get(MOCK_DATASET_KEY)!.valueToIds).to.deep.equal(
        new Map([
          ["2", new Set([1])],
          ["3", new Set([2])],
          ["4", new Set([7])],
        ])
      );
      expect(labels[1].datasetToIdData.get(MOCK_DATASET_KEY)!.idToValue).to.deep.equal(
        new Map([
          [1, "2"],
          [2, "3"],
          [7, "4"],
        ])
      );

      expect(labels[2].datasetToIdData.get(MOCK_DATASET_KEY)!.ids).toEqual(new Set([0, 2]));
      expect(labels[2].datasetToIdData.get(MOCK_DATASET_KEY)!.valueToIds).to.deep.equal(
        new Map([
          ["A", new Set([0])],
          ["C", new Set([2])],
        ])
      );
      expect(labels[2].datasetToIdData.get(MOCK_DATASET_KEY)!.idToValue).to.deep.equal(
        new Map([
          [0, "A"],
          [2, "C"],
        ])
      );
    });

    it("handles mixed boolean capitalization", () => {
      const mockCsvHeaders = `ID,Track,Frame,${BOOLEAN_LABEL_KEY}\r\n`;
      const mockCsvData =
        `0,0,0,true\r\n` +
        `1,0,1,True\r\n` +
        `2,0,2,TRUE\r\n` +
        `3,1,3,false\r\n` +
        `4,1,4,False\r\n` +
        `5,1,5,FALSE\r\n`;
      const mockCsv = mockCsvHeaders + mockCsvData;
      const result = AnnotationData.fromCsv(MOCK_DATASET_KEY, MOCK_DATASET, mockCsv);
      const annotationData = result.annotationData;
      const labels = annotationData.getLabels();
      expect(labels.length).toBe(1);
      expect(labels[0].options.name).toBe(BOOLEAN_LABEL_KEY);
      expect(labels[0].options.type).toBe(LabelType.BOOLEAN);
      expect(labels[0].datasetToIdData.get(MOCK_DATASET_KEY)!.ids).toEqual(new Set([0, 1, 2]));
      expect(labels[0].datasetToIdData.get(MOCK_DATASET_KEY)!.valueToIds.get(BOOLEAN_VALUE_TRUE)).toEqual(
        new Set([0, 1, 2])
      );
    });

    it("parses label ID as a column", () => {
      const mockCsvHeaders = `ID,Label,Track,Frame,${BOOLEAN_LABEL_KEY}\r\n`;
      const mockCsvData =
        `0,0,0,0,${BOOLEAN_VALUE_TRUE}\r\n` +
        `1,1,0,1,${BOOLEAN_VALUE_TRUE}\r\n` +
        `2,2,0,2,${BOOLEAN_VALUE_TRUE}\r\n` +
        `3,3,1,3,${BOOLEAN_VALUE_TRUE}\r\n`;
      const mockCsv = mockCsvHeaders + mockCsvData;
      const result = AnnotationData.fromCsv(MOCK_DATASET_KEY, MOCK_DATASET, mockCsv);
      const annotationData = result.annotationData;

      // Does not parse label ID as an annotation, just as metadata
      const labels = annotationData.getLabels();
      expect(labels.length).toBe(1);
      expect(labels[0].options.name).toBe(BOOLEAN_LABEL_KEY);
      expect(labels[0].datasetToIdData.get(MOCK_DATASET_KEY)!.ids).toEqual(new Set([0, 1, 2, 3]));
    });

    it("detects mismatches on label ID", () => {
      const mockCsvHeaders = `ID,Label,Track,Frame,${BOOLEAN_LABEL_KEY}\r\n`;
      const mockCsvData =
        `0,0,0,0,${BOOLEAN_VALUE_TRUE}\r\n` +
        `1,1,0,1,${BOOLEAN_VALUE_TRUE}\r\n` +
        `2,2,0,2,${BOOLEAN_VALUE_TRUE}\r\n` +
        `3,15,1,3,${BOOLEAN_VALUE_TRUE}\r\n`; // Mismatch on this line
      const mockCsv = mockCsvHeaders + mockCsvData;
      const result = AnnotationData.fromCsv(MOCK_DATASET_KEY, MOCK_DATASET, mockCsv);

      expect(result.mismatchedLabels).toEqual(1);
      expect(result.annotationData.getLabels().length).toBe(1);
    });

    it("allows empty/NaN label IDs", () => {
      const mockCsvHeaders = `ID,Label,Track,Frame,${BOOLEAN_LABEL_KEY}\r\n`;
      const mockCsvData =
        `0,0,0,0,${BOOLEAN_VALUE_TRUE}\r\n` +
        `1,1,0,1,${BOOLEAN_VALUE_TRUE}\r\n` +
        `2,2,0,2,${BOOLEAN_VALUE_TRUE}\r\n` +
        `3,,1,3,${BOOLEAN_VALUE_TRUE}\r\n`; // Empty on this line
      const mockCsv = mockCsvHeaders + mockCsvData;
      const result = AnnotationData.fromCsv(MOCK_DATASET_KEY, MOCK_DATASET, mockCsv);

      expect(result.mismatchedLabels).toEqual(0);
      expect(result.unparseableRows).toEqual(0);
    });
  });

  describe("toCsv + fromCsv integration", () => {
    it("toCsv + fromCsv preserves annotation data", () => {
      const sourceAnnotations = new AnnotationData();
      sourceAnnotations.createNewLabel({ name: BOOLEAN_LABEL_KEY, type: LabelType.BOOLEAN });
      sourceAnnotations.createNewLabel({ name: CUSTOM_LABEL_KEY, type: LabelType.CUSTOM });

      sourceAnnotations.setLabelValueOnIds("dataset_1", MOCK_DATASET, 0, [0, 2], BOOLEAN_VALUE_TRUE);
      sourceAnnotations.setLabelValueOnIds("dataset_2", MOCK_DATASET, 0, [4], BOOLEAN_VALUE_TRUE);
      sourceAnnotations.setLabelValueOnIds("dataset_1", MOCK_DATASET, 1, [1], "A");
      sourceAnnotations.setLabelValueOnIds("dataset_2", MOCK_DATASET, 1, [5], "B");

      const csv = sourceAnnotations.toCsv();
      const parseResult = AnnotationData.fromCsv("dataset_1", MOCK_DATASET, csv);
      const parsedAnnotations = parseResult.annotationData;
      const labels = parsedAnnotations.getLabels();

      expect(labels.length).toBe(2);
      expect(labels[0].options.name).toBe(BOOLEAN_LABEL_KEY);
      expect(labels[0].options.type).toBe(LabelType.BOOLEAN);
      expect(labels[1].options.name).toBe(CUSTOM_LABEL_KEY);
      expect(labels[1].options.type).toBe(LabelType.CUSTOM);

      expect(parsedAnnotations.isLabelOnId("dataset_1", 0, 0)).toBe(true);
      expect(parsedAnnotations.isLabelOnId("dataset_1", 0, 2)).toBe(true);
      expect(parsedAnnotations.isLabelOnId("dataset_1", 0, 1)).toBe(false);
      expect(parsedAnnotations.isLabelOnId("dataset_2", 0, 4)).toBe(true);

      expect(parsedAnnotations.getValueFromId("dataset_1", 1, 1)).toBe("A");
      expect(parsedAnnotations.getValueFromId("dataset_2", 1, 5)).toBe("B");
      expect(parsedAnnotations.getValueFromId("dataset_1", 1, 0)).toBeNull();

      expect(parseResult.unparseableRows).toEqual(0);
      expect(parseResult.invalidIds).toEqual(0);
    });

    it("fromCsv replaces mismatched metadata values", () => {
      const mockCsvHeaders = `Dataset,ID,Label,Track,Frame,${BOOLEAN_LABEL_KEY}\r\n`;
      // TODO: In the case of a mismatch, and a matching track + time + seg ID
      // is found, should the ID be replaced instead?
      const mockCsvData =
        `${MOCK_DATASET_KEY},0,-40,30,20,${BOOLEAN_VALUE_TRUE}\r\n` +
        `${MOCK_DATASET_KEY},1,5,5,5,${BOOLEAN_VALUE_TRUE}\r\n` +
        `${MOCK_DATASET_KEY},2,6,7,8,${BOOLEAN_VALUE_TRUE}\r\n` +
        `${MOCK_DATASET_KEY},3,9,10,11,${BOOLEAN_VALUE_TRUE}\r\n`;

      const mockCsv = mockCsvHeaders + mockCsvData;
      const result = AnnotationData.fromCsv(MOCK_DATASET_KEY, mockDataset, mockCsv);
      const annotationData = result.annotationData;
      const csv = annotationData.toCsv();
      const parsedLines = csv.split("\r\n");
      expect(parsedLines.length).toBe(5); // header + 4 data lines
      // Metadata columns should match the dataset values instead of the
      // original CSV values
      expect(parsedLines[1]).toEqual(`${MOCK_DATASET_KEY},0,0,0,0,true`);
      expect(parsedLines[2]).toEqual(`${MOCK_DATASET_KEY},1,1,1,1,true`);
      expect(parsedLines[3]).toEqual(`${MOCK_DATASET_KEY},2,2,2,2,true`);
      expect(parsedLines[4]).toEqual(`${MOCK_DATASET_KEY},3,3,3,3,true`);
    });
  });

  describe("merge", () => {
    const booleanLabelKey = "Boolean Label";
    const customLabelKey = "Custom Label";

    const getExampleAnnotationData1 = (): AnnotationData => {
      const annotationData = new AnnotationData();
      annotationData.createNewLabel({ name: customLabelKey, type: LabelType.CUSTOM });
      annotationData.setLabelValueOnIds(MOCK_DATASET_KEY, MOCK_DATASET, 0, [0, 1, 2], "a");
      annotationData.setLabelValueOnIds(MOCK_DATASET_KEY, MOCK_DATASET, 0, [3], "b");
      return annotationData;
    };

    const getExampleAnnotationData2 = (): AnnotationData => {
      const annotationData = new AnnotationData();
      annotationData.createNewLabel({ name: booleanLabelKey, type: LabelType.BOOLEAN });
      annotationData.setLabelValueOnIds(MOCK_DATASET_KEY, MOCK_DATASET, 0, [0, 1, 4], BOOLEAN_VALUE_TRUE);
      return annotationData;
    };

    it("can overwrite data", () => {
      const annotationData1 = getExampleAnnotationData1();
      const annotationData2 = getExampleAnnotationData2();
      const mergedData = AnnotationData.merge(annotationData1, annotationData2, AnnotationMergeMode.OVERWRITE);

      const labels = mergedData.getLabels();
      expect(labels.length).toBe(1);

      const originalLabel = annotationData2.getLabels()[0];
      const newLabel = labels[0];
      expect(newLabel.options.name).toBe(originalLabel.options.name);
      expect(newLabel.options.type).toBe(originalLabel.options.type);
      expect(newLabel.datasetToIdData.get(MOCK_DATASET_KEY)!.ids).toEqual(
        originalLabel.datasetToIdData.get(MOCK_DATASET_KEY)!.ids
      );
      expect(newLabel.datasetToIdData.get(MOCK_DATASET_KEY)!.valueToIds.get(BOOLEAN_VALUE_TRUE)).toEqual(
        new Set([0, 1, 4])
      );
    });

    it("makes a deep copy of merged data", () => {
      const annotationData1 = getExampleAnnotationData1();
      const annotationData2 = getExampleAnnotationData2();
      const mergedData = AnnotationData.merge(annotationData1, annotationData2, AnnotationMergeMode.OVERWRITE);

      // Merged data should be a deep copy of annotationData2
      const labels = mergedData.getLabels();
      expect(labels.length).toBe(1);

      annotationData1.createNewLabel({ name: "New Label", type: LabelType.CUSTOM });
      annotationData1.setLabelValueOnIds(MOCK_DATASET_KEY, MOCK_DATASET, 0, [0], "new value");

      annotationData2.createNewLabel({ name: "Another New Label", type: LabelType.CUSTOM });
      annotationData2.removeLabelOnIds(MOCK_DATASET_KEY, 0, [0, 1, 4]);

      expect(mergedData.getLabels().length).toBe(1);
      expect(mergedData.getLabels()[0].datasetToIdData.get(MOCK_DATASET_KEY)!.ids).toEqual(new Set([0, 1, 4]));
    });

    it("can append data", () => {
      const annotationData1 = getExampleAnnotationData1();
      const annotationData2 = getExampleAnnotationData2();

      const mergedData = AnnotationData.merge(annotationData1, annotationData2, AnnotationMergeMode.APPEND);
      const labels = mergedData.getLabels();
      expect(labels.length).toBe(2);
      expect(labels[0].options.name).toBe(customLabelKey);
      expect(labels[0].options.type).toBe(LabelType.CUSTOM);
      expect(labels[0].datasetToIdData.get(MOCK_DATASET_KEY)!.ids).toEqual(new Set([0, 1, 2, 3]));
      expect(labels[0].datasetToIdData.get(MOCK_DATASET_KEY)!.valueToIds.get("a")).toEqual(new Set([0, 1, 2]));
      expect(labels[0].datasetToIdData.get(MOCK_DATASET_KEY)!.valueToIds.get("b")).toEqual(new Set([3]));
      expect(labels[1].options.name).toBe(booleanLabelKey);
      expect(labels[1].options.type).toBe(LabelType.BOOLEAN);
      expect(labels[1].datasetToIdData.get(MOCK_DATASET_KEY)!.ids).toEqual(new Set([0, 1, 4]));
      expect(labels[1].datasetToIdData.get(MOCK_DATASET_KEY)!.valueToIds.get(BOOLEAN_VALUE_TRUE)).toEqual(
        new Set([0, 1, 4])
      );
    });

    it("can merge data", () => {
      const annotationData1 = getExampleAnnotationData1();

      const annotationData2 = new AnnotationData();
      annotationData2.createNewLabel({ name: customLabelKey, type: LabelType.CUSTOM });
      annotationData2.setLabelValueOnIds(MOCK_DATASET_KEY, MOCK_DATASET, 0, [5, 6, 7], "c");
      annotationData2.setLabelValueOnIds(MOCK_DATASET_KEY, MOCK_DATASET, 0, [4], "a");

      const mergedData = AnnotationData.merge(annotationData1, annotationData2, AnnotationMergeMode.MERGE);
      const labels = mergedData.getLabels();
      expect(labels.length).toBe(1);
      expect(labels[0].options.name).toBe(customLabelKey);
      expect(labels[0].options.type).toBe(LabelType.CUSTOM);
      expect(labels[0].datasetToIdData.get(MOCK_DATASET_KEY)!.ids).toEqual(new Set([0, 1, 2, 3, 4, 5, 6, 7]));
      expect(labels[0].datasetToIdData.get(MOCK_DATASET_KEY)!.valueToIds.get("a")).toEqual(new Set([0, 1, 2, 4]));
      expect(labels[0].datasetToIdData.get(MOCK_DATASET_KEY)!.valueToIds.get("b")).toEqual(new Set([3]));
      expect(labels[0].datasetToIdData.get(MOCK_DATASET_KEY)!.valueToIds.get("c")).toEqual(new Set([5, 6, 7]));
    });

    it("does not merge matching labels with different types", () => {
      const annotationData1 = getExampleAnnotationData1();
      const annotationData2 = new AnnotationData();
      annotationData2.createNewLabel({ name: customLabelKey, type: LabelType.BOOLEAN });
      annotationData2.setLabelValueOnIds(MOCK_DATASET_KEY, MOCK_DATASET, 0, [5, 6, 7], BOOLEAN_VALUE_TRUE);

      const mergedData = AnnotationData.merge(annotationData1, annotationData2, AnnotationMergeMode.MERGE);
      const labels = mergedData.getLabels();
      expect(labels.length).toBe(2);
      expect(labels[0].options.name).toBe(customLabelKey);
      expect(labels[0].options.type).toBe(LabelType.CUSTOM);
      expect(labels[0].datasetToIdData.get(MOCK_DATASET_KEY)!.ids).toEqual(new Set([0, 1, 2, 3]));
      expect(labels[1].options.name).toBe(customLabelKey);
      expect(labels[1].options.type).toBe(LabelType.BOOLEAN);
      expect(labels[1].datasetToIdData.get(MOCK_DATASET_KEY)!.ids).toEqual(new Set([5, 6, 7]));
    });

    it("overwrites conflicting values during merge", () => {
      const annotationData1 = getExampleAnnotationData1();

      const annotationData2 = new AnnotationData();
      annotationData2.createNewLabel({ name: customLabelKey, type: LabelType.CUSTOM });
      annotationData2.setLabelValueOnIds(MOCK_DATASET_KEY, MOCK_DATASET, 0, [0, 1, 4, 5], "c");

      const mergedData = AnnotationData.merge(annotationData1, annotationData2, AnnotationMergeMode.MERGE);
      const labels = mergedData.getLabels();
      expect(labels.length).toBe(1);
      expect(labels[0].options.name).toBe(customLabelKey);
      expect(labels[0].options.type).toBe(LabelType.CUSTOM);
      expect(labels[0].datasetToIdData.get(MOCK_DATASET_KEY)!.ids).toEqual(new Set([0, 1, 2, 3, 4, 5]));
      expect(labels[0].datasetToIdData.get(MOCK_DATASET_KEY)!.valueToIds.get("a")).toEqual(new Set([2]));
      expect(labels[0].datasetToIdData.get(MOCK_DATASET_KEY)!.valueToIds.get("b")).toEqual(new Set([3]));
      expect(labels[0].datasetToIdData.get(MOCK_DATASET_KEY)!.valueToIds.get("c")).toEqual(new Set([0, 1, 4, 5]));
    });
  });
});
