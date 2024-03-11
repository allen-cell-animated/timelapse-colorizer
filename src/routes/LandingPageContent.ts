import { ProjectEntry } from "../types";

export const landingPageContent: ProjectEntry[] = [
  {
    name: "NucMorph dataset name which usually is a rather long name so may wrap to two lines",
    description:
      "Introductory explanatory text about the dataset(s) and anything a user should know before opening in app. This should ideally only be a couple of sentences.",
    publicationLink: new URL("https://www.google.com"),
    publicationName:
      "This is the name of the associated publication that the user can click to open in a new tab (Publisher name, mm/dd/yyyy)",
    loadLink:
      "viewer?collection=https%3A%2F%2Fdev-aics-dtp-001.int.allencell.org%2Fdan-data%2Fcolorizer%2Fdata%2Fcollection.json&dataset=Mama+Bear&feature=Volume&color=matplotlib-cool",
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
        loadLink:
          "viewer?collection=https%3A%2F%2Fdev-aics-dtp-001.int.allencell.org%2Fdan-data%2Fcolorizer%2Fdata%2Fcollection.json&dataset=Baby+Bear&feature=Height&t=154&range=0.540%2C9.452&color=esri-mentone_beach&palette-key=adobe",
      },
      {
        name: "This is a dataset with a semi-long name",
        description: "This is a long description about this particular dataset. 2 lines at most.",
        loadLink:
          "viewer?collection=https%3A%2F%2Fdev-aics-dtp-001.int.allencell.org%2Fdan-data%2Fcolorizer%2Fdata%2Fcollection.json&dataset=Goldilocks&feature=Height&t=446&range=1.084%2C8.156&color=esri-blue_red_8&palette-key=adobe&bg-sat=100&bg-brightness=100&fg-alpha=100&outlier-color=c0c0c0&outlier-mode=1&filter-color=dddddd&filter-mode=1&tab=track_plot&scalebar=1&timestamp=1&path=1&keep-range=0&scatter-range=all",
      },
      {
        name: "This is a dataset with a semi-long name",
        description: "This is a short description about this particular dataset. 2 lines at most.",
        loadLink:
          "viewer?collection=https%3A%2F%2Fdev-aics-dtp-001.int.allencell.org%2Fdan-data%2Fcolorizer%2Fdata%2Fcollection.json&dataset=Baby+Bear&feature=Height&t=397&filters=Volume%3A%25C2%25B5m%25C2%25B3%3A649.121%3A2457.944&range=0.540%2C8.895&color=esri-green_brown_1&palette-key=adobe&bg-sat=100&bg-brightness=100&fg-alpha=100&outlier-color=c0c0c0&outlier-mode=1&filter-color=858585&filter-mode=1&tab=settings&scalebar=1&timestamp=1&path=1&keep-range=0&scatter-range=all",
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
        loadLink: "link1",
      },
      {
        name: "This is a dataset with a semi-long name",
        description:
          "This is a long description about this particular dataset. 2 lines at most, but it has extra lines, so the entire section should wrap.",
        loadLink: "link1",
      },
    ],
  },
  {
    name: "This is a project name in the case of multiple datasets belonging to a single project/publication",
    description:
      "Introductory explanatory text about the dataset(s) and anything a user should know before opening in app. This should ideally only be a couple of sentences.",
    publicationLink: new URL("https://www.google.com"),
    publicationName:
      "This is the name of the associated publication that the user can click to open in a new tab (Publisher name, mm/dd/yyyy)",
    datasets: [
      {
        name: "This is a dataset with a semi-long name",
        description: "This is a short description about this particular dataset. 2 lines at most.",
        loadLink: "link1",
      },
      {
        name: "This is a dataset with a semi-long name",
        description:
          "This is a long description about this particular dataset. 2 lines at most, but it has extra lines, so the entire section should wrap.",
        loadLink: "link1",
      },
      {
        name: "This is a dataset with a longer name than the other elements, which should cause it to wrap",
        description: "This is a short description about this particular dataset. 2 lines at most.",
        loadLink: "link1",
      },
      {
        name: "This is a dataset with a longer name than the other elements, which should cause it to wrap",
        description: "This is a short description about this particular dataset. 2 lines at most.",
        loadLink: "link1",
      },
      {
        name: "This is a dataset with a longer name than the other elements, which should cause it to wrap",
        description: "This is a short description about this particular dataset. 2 lines at most.",
        loadLink: "link1",
      },
    ],
  },
];
