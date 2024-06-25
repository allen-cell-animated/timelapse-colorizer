import { faUpRightFromSquare } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React from "react";

import { ThresholdType } from "../colorizer/types";
import { ProjectEntry } from "../types";

export const landingPageContent: ProjectEntry[] = [
  {
    name: "Tracked hiPSC FOV-nuclei timelapse datasets",
    inReview: true,
    description: (
      <p>
        Maximum projections of tracked 3D segmentations of nuclei in growing hiPS cell colonies, with quantitative
        features of nuclear shape, size and more. The exploratory dataset includes all tracked nuclei, with the baseline
        colonies, full-interphase, and lineage-annotated datasets as subsets of this dataset, analyzed in the study of
        nuclear growth{" "}
        <a href="https://www.biorxiv.org/" rel="noopener noreferrer" target="_blank">
          {"<Biorxiv ref>"}
          <FontAwesomeIcon icon={faUpRightFromSquare} size="sm" style={{ marginBottom: "-1px", marginLeft: "3px" }} />
        </a>
        . For documentation on the features available in these datasets, visit{" "}
        <a
          href="https://open.quiltdata.com/b/allencell/tree/aics/nuc-morph-dataset/timelapse_feature_explorer_datasets/"
          rel="noopener noreferrer"
          target="_blank"
        >
          {"our datasets hosted on Quilt"}
          <FontAwesomeIcon icon={faUpRightFromSquare} size="sm" style={{ marginBottom: "-1px", marginLeft: "3px" }} />
        </a>
        .
      </p>
    ),
    // publicationLink: new URL("https://www.google.com"),
    // publicationName: "<NucMorph manuscript> (Publisher name, mm/dd/yyyy)",
    datasets: [
      {
        name: "Exploratory dataset",
        description: "All successful tracked nuclei, with all available features and filters",
        loadParams: {
          collection:
            "https://allencell.s3.amazonaws.com/aics/nuc-morph-dataset/timelapse_feature_explorer_datasets/exploratory_dataset/collection.json",
          time: 15,
          thresholds: [
            {
              featureKey: "growth_outlier_filter",
              type: ThresholdType.CATEGORICAL,
              unit: "",
              enabledCategories: [true, true],
            },
            {
              featureKey: "baseline_colonies_dataset_filter",
              type: ThresholdType.CATEGORICAL,
              unit: "",
              enabledCategories: [true, true],
            },
            {
              featureKey: "fullinterphase_dataset_filter",
              type: ThresholdType.CATEGORICAL,
              unit: "",
              enabledCategories: [true, true],
            },
            {
              featureKey: "lineageannotated_dataset_filter",
              type: ThresholdType.CATEGORICAL,
              unit: "",
              enabledCategories: [true, true],
            },
          ],
        },
      },
      {
        name: "Baseline colonies dataset",
        description:
          "Minimally filtered tracked nuclei with quantitative single-timepoint features (subset of exploratory analysis dataset)",
        loadParams: {
          collection:
            "https://allencell.s3.amazonaws.com/aics/nuc-morph-dataset/timelapse_feature_explorer_datasets/baseline_colonies_dataset/collection.json",
          time: 15,
        },
      },
      {
        name: "Full-interphase dataset",
        description:
          "Nuclei tracked throughout interphase (subset of baseline colonies analysis dataset, with added growth trajectory features)",
        loadParams: {
          collection:
            "https://allencell.s3.amazonaws.com/aics/nuc-morph-dataset/timelapse_feature_explorer_datasets/full-interphase_dataset/collection.json",
          time: 15,
        },
      },
      {
        name: "Lineage-annotated dataset",
        description:
          "Nuclei tracked across multiple generations (subset of full-interphase analysis dataset, with added lineage annotation)",
        loadParams: {
          collection:
            "https://allencell.s3.amazonaws.com/aics/nuc-morph-dataset/timelapse_feature_explorer_datasets/lineage-annotated_dataset/collection.json",
          time: 15,
        },
      },
    ],
  },
];
