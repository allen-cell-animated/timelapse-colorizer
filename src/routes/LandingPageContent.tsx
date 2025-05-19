import React from "react";

import { ThresholdType } from "../colorizer/types";
import { ExternalLink } from "../styles/utils";
import { ProjectEntry } from "../types";

export const landingPageContent: ProjectEntry[] = [
  {
    name: "Tracked hiPSC FOV-nuclei timelapse datasets",
    inReview: false,
    description: (
      <>
        Maximum projections of tracked 3D segmentations of nuclei in growing hiPS cell colonies, with quantitative
        features of nuclear shape, size and more. The exploratory dataset includes all tracked nuclei, with the baseline
        colonies, full-interphase, and lineage-annotated datasets as subsets of this dataset. For documentation on the
        features available in these datasets, visit{" "}
        <ExternalLink
          href={
            "https://open.quiltdata.com/b/allencell/tree/aics/nuc-morph-dataset/timelapse_feature_explorer_datasets/"
          }
        >
          our datasets hosted on Quilt
        </ExternalLink>
        .
      </>
    ),
    publicationInfo: {
      url: new URL("https://doi.org/10.1016/j.cels.2025.101265"),
      name: "Colony context and size-dependent compensation mechanisms give rise to variations in nuclear growth trajectories",
      citation: "Cell Systems, May 2025",
    },
    datasets: [
      {
        name: "Baseline colonies dataset",
        description:
          "Minimally filtered tracked nuclei with quantitative single-timepoint features (subset of exploratory analysis dataset)",
        loadParams: {
          collectionParam:
            "https://allencell.s3.amazonaws.com/aics/nuc-morph-dataset/timelapse_feature_explorer_datasets/baseline_colonies_dataset/collection.json",
          currentFrame: 15,
        },
      },
      {
        name: "Full-interphase dataset",
        description:
          "Nuclei tracked throughout interphase (subset of baseline colonies analysis dataset, with added growth trajectory features)",
        loadParams: {
          collectionParam:
            "https://allencell.s3.amazonaws.com/aics/nuc-morph-dataset/timelapse_feature_explorer_datasets/full-interphase_dataset/collection.json",
          currentFrame: 15,
        },
      },
      {
        name: "Lineage-annotated dataset",
        description:
          "Nuclei tracked across multiple generations (subset of full-interphase analysis dataset, with added lineage annotation)",
        loadParams: {
          collectionParam:
            "https://allencell.s3.amazonaws.com/aics/nuc-morph-dataset/timelapse_feature_explorer_datasets/lineage-annotated_dataset/collection.json",
          currentFrame: 15,
        },
      },
      {
        name: "Exploratory dataset",
        description: "All successful tracked nuclei, with all available features and filters",
        loadParams: {
          collectionParam:
            "https://allencell.s3.amazonaws.com/aics/nuc-morph-dataset/timelapse_feature_explorer_datasets/exploratory_dataset/collection.json",
          currentFrame: 15,
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
    ],
  },
];
