import React from "react";
import { Color } from "three";

import { DrawMode, ThresholdType } from "../colorizer/types";
import { ProjectEntry } from "../types";

export const landingPageContent: ProjectEntry[] = [
  {
    name: "Segmented hiPSC FOV-nuclei timelapse and analysis datasets",
    description:
      "Maximum projections of tracked 3D segmentations of nuclei in growing hiPS cell colonies, with quantitative features of nuclear shape, size and more. The exploratory dataset includes all tracked nuclei, with the baseline colony, full-interphase and lineage-annotated datasets as subsets of this dataset, analyzed in the study of nuclear growth <Biorxiv ref>. For documentation on the features available in these datasets, visit <link to quilt readme on features>.",
    publicationLink: new URL("https://www.google.com"),
    publicationName: "<NucMorph manuscript> (Publisher name, mm/dd/yyyy)",
    datasets: [
      {
        name: "Exploratory dataset",
        description: "All successful tracked nuclei, with all available features and filters",
        loadParams: {},
      },
      {
        name: "Baseline colony dataset",
        description: (
          <p>
            Nuclei tracked throughout colony growth
            <br />
            (subset of exploratory analysis dataset)
          </p>
        ),
        loadParams: {},
      },
      {
        name: "Full-interphase dataset",
        description: (
          <p>
            Nuclei tracked throughout interphase
            <br />
            (subset of baseline colony analysis dataset, with added growth trajectory features)
          </p>
        ),
        loadParams: {},
      },
      {
        name: "Lineage-annotated dataset",
        description: (
          <p>
            Nuclei tracked across multiple generations
            <br />
            (subset of full-interphase analysis dataset, with added lineage annotation)
          </p>
        ),
        loadParams: {},
      },
    ],
  },
  {
    name: "NucMorph dataset name which usually is a rather long name so may wrap to two lines",
    description:
      "Introductory explanatory text about the dataset(s) and anything a user should know before opening in app. This should ideally only be a couple of sentences.",
    publicationLink: new URL("https://www.google.com"),
    publicationName:
      "This is the name of the associated publication that the user can click to open in a new tab (Publisher name, mm/dd/yyyy)",
    loadParams: {
      collection: "https://dev-aics-dtp-001.int.allencell.org/dan-data/colorizer/data/collection.json",
      dataset: "Mama Bear",
      feature: "volume",
    },
    inReview: true,
  },
  {
    name: "This is a project name in the case of multiple datasets belonging to a single project/publication",
    description:
      "Introductory explanatory text about the dataset(s) and anything a user should know before opening in app. This should ideally only be a couple of sentences.",
    datasets: [
      {
        name: "This is a dataset with a semi-long name",
        description: "This is a short description about this particular dataset. 2 lines at most.",
        loadParams: {
          collection: "https://dev-aics-dtp-001.int.allencell.org/dan-data/colorizer/data/collection.json",
          dataset: "Mama Bear",
          feature: "height",
          range: [0.54, 9.452],
          colorRampKey: "esri-mentone_beach",
          time: 154,
        },
      },
      {
        name: "This is a dataset with a semi-long name",
        description: "This is a long description about this particular dataset. 2 lines at most.",
        loadParams: {
          collection: "https://dev-aics-dtp-001.int.allencell.org/dan-data/colorizer/data/collection.json",
          dataset: "Goldilocks",
          feature: "height",
          range: [1.084, 8.156],
          colorRampKey: "esri-blue_red_8",
          time: 446,
        },
      },
      {
        name: "This is a dataset with a semi-long name",
        description: "This is a short description about this particular dataset. 2 lines at most.",
        loadParams: {
          collection: "https://dev-aics-dtp-001.int.allencell.org/dan-data/colorizer/data/collection.json",
          dataset: "Baby Bear",
          feature: "height",
          range: [0.54, 8.895],
          colorRampKey: "esri-green_brown_1",
          time: 397,
          thresholds: [
            {
              featureKey: "volume",
              type: ThresholdType.NUMERIC,
              unit: "µm³",
              min: 649.121,
              max: 2457.944,
            },
          ],
          config: {
            outOfRangeDrawSettings: {
              mode: DrawMode.USE_COLOR,
              color: new Color("#858585"),
            },
          },
        },
      },
    ],
  },
  {
    name: "This is a project name in the case of multiple datasets belonging to a single project/publication",
    description:
      "Introductory explanatory text about the dataset(s) and anything a user should know before opening in app. This should ideally only be a couple of sentences.",
    datasets: [
      {
        name: "This is a dataset with a semi-long name",
        description: "This is a short description about this particular dataset. 2 lines at most.",
        loadParams: {},
      },
      {
        name: "This is a dataset with a semi-long name",
        description:
          "This is a long description about this particular dataset. 2 lines at most, but it has extra lines, so the entire section should wrap.",
        loadParams: {},
      },
    ],
  },
];
