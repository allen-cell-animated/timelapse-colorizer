import {
  BOOLEAN_VALUE_FALSE,
  BOOLEAN_VALUE_TRUE,
  type LabelData,
  LabelType,
  PerDatasetLabelData,
} from "src/colorizer/AnnotationData";

export function getLabelTypeFromParsedCsv(
  headers: string[],
  data: Record<string, string | undefined>[]
): Map<string, LabelType> {
  const labelTypeMap = new Map<string, LabelType>();
  for (const header of headers) {
    let isAllIntegers = true;
    let isAllBooleans = true;
    for (const row of data) {
      const value = row[header]?.trim();
      if (value === undefined || value === "") {
        continue;
      }
      const valueAsInt = parseInt(value ?? "", 10);
      if (value.toLowerCase() === BOOLEAN_VALUE_TRUE || value.toLowerCase() === BOOLEAN_VALUE_FALSE) {
        isAllIntegers = false;
      } else if (valueAsInt.toString(10) === value && Number.isInteger(valueAsInt)) {
        // ^ check that the value's string representation is the same as the
        // parsed integer (there would be a mismatch for float values, e.g.
        // "1.0" != 1)
        isAllBooleans = false;
      } else {
        // String/custom value (neither int nor boolean)
        isAllBooleans = false;
        isAllIntegers = false;
        break;
      }
      if (!isAllIntegers && !isAllBooleans) {
        // Triggers if there are both integer and boolean values in the same
        // column, which will be handled as custom
        break;
      }
    }

    if (isAllIntegers) {
      labelTypeMap.set(header, LabelType.INTEGER);
    } else if (isAllBooleans) {
      labelTypeMap.set(header, LabelType.BOOLEAN);
    } else {
      labelTypeMap.set(header, LabelType.CUSTOM);
    }
  }
  return labelTypeMap;
}

function clonePerDatasetLabelData(labelIdData: PerDatasetLabelData): PerDatasetLabelData {
  const valueToIds = new Map<string, Set<number>>();
  for (const [value, ids] of labelIdData.valueToIds.entries()) {
    valueToIds.set(value, new Set(ids));
  }
  return {
    ids: new Set(labelIdData.ids),
    valueToIds,
    idToValue: new Map(labelIdData.idToValue),
  };
}

export function cloneLabelData(label: LabelData): LabelData {
  const datasetToIdData = label.datasetToIdData;
  const newDatasetToIdData = new Map<string, PerDatasetLabelData>();

  for (const [datasetId, perDatasetData] of datasetToIdData.entries()) {
    newDatasetToIdData.set(datasetId, clonePerDatasetLabelData(perDatasetData));
  }

  return {
    options: {
      ...label.options,
      color: label.options.color.clone(),
    },
    lastValue: label.lastValue,
    datasetToIdData: newDatasetToIdData,
  };
}
