import { ProjectEntry } from "../types";

export const landingPageContent: ProjectEntry[] = [
  {
    name: "This is a project name in the case of multiple datasets belonging to a single project/publication",
    description:
      "Introductory explanatory text about the dataset(s) and anything a user should know before opening in app. This should ideally only be a couple of sentences.",
    publicationLink: new URL("https://www.google.com"),
    publicationName:
      "This is the name of the associated publication that the user can click to open in a new tab (Publisher name, mm/dd/yyyy)",
    loadLink: "link1",
    inReview: true,
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
        description: "This is a long description about this particular dataset. 2 lines at most.",
        loadLink: "link1",
      },
      {
        name: "This is a dataset with a semi-long name",
        description: "This is a short description about this particular dataset. 2 lines at most.",
        loadLink: "link1",
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
];
