import { faUpRightFromSquare } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Button, Card } from "antd";
import React, { ReactElement, useContext } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";

import { FlexColumn, FlexColumnAlignCenter, FlexRow, FlexRowAlignCenter, VisuallyHidden } from "../styles/utils";
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
  gap: 20px;
  padding: 0;

  // Add a pseudo-element line between cards
  & > li::before {
    content: "";
    display: block;
    width: 100%;
    height: 1px;
    background-color: var(--color-borders);
    margin-bottom: 10px;
  }
`;

const ProjectCard = styled.li`
  display: flex;
  width: 100%;
  flex-direction: column;
  gap: 12px;
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
  padding: 5px;

  & > h4 {
    width: 100%;
    text-align: center;
    display: grid;
    grid-row: 1;
    margin: 0;
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

const InReviewFlag = styled(FlexRowAlignCenter)`
  border-radius: 4px;
  padding: 1px 6px;
  background-color: var(--color-flag-background);
  height: 22px;
  flex-wrap: wrap;

  & > p {
    color: var(--color-flag-text);
    font-size: 10px;
    font-weight: 700;
    white-space: nowrap;
  }
`;

const exampleData: ProjectEntry[] = [
  {
    name: "This is a project name in the case of multiple datasets belonging to a single project/publication",
    description:
      "Introductory explanatory text about the dataset(s) and anything a user should know before opening in app. This should ideally only be a couple of sentences.",
    publicationLink: new URL("https://www.google.com"),
    publicationName: "Some publication name",
    loadLink: "link1",
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
        <h4>{dataset.name}</h4>
        <p>{dataset.description}</p>
        <Link to={dataset.loadLink}>
          <Button type="primary">Load</Button>
        </Link>
      </DatasetCard>
    );
  };

  const renderProject = (project: ProjectEntry, index: number): ReactElement => {
    // TODO: Add fontawesome arrow icon at end of link
    // also custom link colors
    const projectNameElement = project.inReview ? (
      <FlexRow style={{ justifyContent: "space-between" }} $gap={10}>
        <h3>{project.name}</h3>
        <InReviewFlag>
          <p>IN REVIEW</p>
        </InReviewFlag>
      </FlexRow>
    ) : (
      <h3>{project.name}</h3>
    );

    const publicationElement = project.publicationLink ? (
      <p>
        Related publication:{" "}
        <a href={project.publicationLink.toString()} target="_blank" rel="noopener noreferrer">
          {project.publicationName}
          {/* Icon offset slightly to align with text */}
          <FontAwesomeIcon icon={faUpRightFromSquare} size="sm" style={{ marginBottom: "-1px", marginLeft: "3px" }} />
          <VisuallyHidden>(opens in new tab)</VisuallyHidden>
        </a>
      </p>
    ) : null;

    const loadButton = project.loadLink ? (
      <Link to={project.loadLink}>
        <Button type="primary">Load</Button>
      </Link>
    ) : null;

    const datasetList = project.datasets ? <DatasetList>{project.datasets.map(renderDataset)}</DatasetList> : null;

    // TODO: Add "In Review" banner
    return (
      <ProjectCard key={index}>
        {projectNameElement}
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
        <FlexColumnAlignCenter $gap={10}>
          <Card>
            <h1>Hello! This is the new WIP landing page.</h1>
            <p>
              If you got to this page with a link that previously took you to the viewer, you can continue using it with
              a quick edit.
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
        </FlexColumnAlignCenter>
        <h3>Get started by loading a dataset below</h3>
        <ProjectList>{exampleData.map(renderProject)}</ProjectList>
      </ContentContainer>
    </>
  );
}
