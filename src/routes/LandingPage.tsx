import { Button, Card } from "antd";
import React, { ReactElement, useContext } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";

import { FlexColumn, FlexRowAlignCenter } from "../styles/utils";
import { DatasetEntry, ProjectEntry } from "../types";

import { AppThemeContext } from "../components/AppStyle";
import { Header, HeaderLogo } from "../components/Header";

const ContentContainer = styled(FlexColumn)`
  max-width: 1060px;
  width: 100%;
  margin: auto;
  padding: 0 20px;
`;

const ProjectList = styled.ul`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 0;

  // Add a pseudo-element line between cards
  & > li::before {
    content: "";
    display: block;
    width: 100%;
    height: 1px;
    background-color: var(--color-borders);
  }
`;

const ProjectCard = styled.li`
  display: flex;
  width: 100%;
  flex-direction: column;
  gap: 10px;
`;

const DatasetList = styled.ol`
  padding: 0;
  width: 100%;
  display: grid;
  // Repeat rows for the title, description, and button link
  grid-template-rows: repeat(3, auto);
  grid-template-columns: repeat(auto-fit, minmax(220px, 280px));
  justify-content: space-around;
  gap: 10px 10px;
`;

const DatasetCard = styled.li`
  display: grid;
  grid-template-rows: subgrid;
  grid-row: span 3;
  min-width: 180px;

  & > h3 {
    width: 100%;
    text-align: center;
    display: grid;
    grid-row: 1;
  }
  & > p {
    width: 100%;
    text-align: center;
    display: grid;
    grid-row: 2;
  }
  & > a {
    margin: auto;
    display: grid;
    grid-row: 3;
  }
`;

const exampleData: ProjectEntry[] = [
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

export default function LandingPage(): ReactElement {
  const theme = useContext(AppThemeContext);

  const renderDataset = (dataset: DatasetEntry, index: number): ReactElement => {
    return (
      <DatasetCard key={index}>
        <h3>{dataset.name}</h3>
        <p>{dataset.description}</p>
        <Link to={dataset.loadLink}>
          <Button type="primary">Load</Button>
        </Link>
      </DatasetCard>
    );
  };

  const renderProject = (project: ProjectEntry, index: number): ReactElement => {
    const publicationElement = project.publicationLink ? <></> : null;

    const loadButton = project.loadLink ? (
      <Link to={project.loadLink}>
        <Button type="primary">Load</Button>
      </Link>
    ) : null;

    const datasetList = project.datasets ? <DatasetList>{project.datasets.map(renderDataset)}</DatasetList> : null;

    return (
      <ProjectCard key={index}>
        <h3>{project.name}</h3>
        <p>{project.description}</p>
        {publicationElement}
        {loadButton}
        {datasetList}
      </ProjectCard>
    );
  };

  return (
    <>
      <Header>
        <HeaderLogo />
      </Header>
      <br />
      <ContentContainer $gap={10}>
        <Card>
          <h1>Hello! This is the new WIP landing page.</h1>
          <p>
            If you got to this page with a link that previously took you to the viewer, you can continue using it with a
            quick edit.
          </p>
          <br />
          <p>If your link previously looked like this:</p>
          <code>https://dev-aics-dtp-001.int.allencell.org/nucmorph-colorizer/dist/index.html?collection=....</code>
          <p>You&#39;ll need to edit it by adding the new viewer subpath:</p>
          <code>
            https://dev-aics-dtp-001.int.allencell.org/nucmorph-colorizer/dist/index.html
            <b>
              <span style={{ color: "var(--color-text-theme)" }}>/#/viewer</span>
            </b>
            ?collection=....
          </code>
          <br />
          <br />
          <p>
            Make sure to update any links you&#39;ve shared with other people. Thanks for your patience while the tool
            is getting ready for release!
          </p>
        </Card>
        <Link to="viewer">
          <Button type="primary" size="large" style={{ fontSize: theme.font.size.label }}>
            <FlexRowAlignCenter>Go to viewer</FlexRowAlignCenter>
          </Button>
        </Link>
        <h3>Get started by loading a dataset below</h3>
        <ProjectList>
          {exampleData.map(renderProject)}
          <ProjectCard>hi</ProjectCard>
          <ProjectCard>hi</ProjectCard>
          <ProjectCard>hi</ProjectCard>
          <ProjectCard>hi</ProjectCard>
        </ProjectList>
      </ContentContainer>
    </>
  );
}
