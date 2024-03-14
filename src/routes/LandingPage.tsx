import { faUpRightFromSquare } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Button, Card, Tooltip } from "antd";
import React, { ReactElement, useContext } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";

import { paramsToUrlQueryString } from "../colorizer/utils/url_utils";
import { FlexColumn, FlexColumnAlignCenter, FlexRow, FlexRowAlignCenter, VisuallyHidden } from "../styles/utils";
import { DatasetEntry, ProjectEntry } from "../types";

import { AppThemeContext } from "../components/AppStyle";
import Header from "../components/Header";
import { landingPageContent } from "./LandingPageContent";

const ContentContainer = styled(FlexColumn)`
  max-width: 1060px;
  width: calc(90vw - 40px);
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

  & h3 {
    font-weight: 600;
  }
`;

const DatasetList = styled.ol`
  padding: 0;
  width: 100%;
  display: grid;
  // Use grid + subgrid to align the title, description, and button for each horizontal
  // row of cards. repeat is used to tile the layout if the cards wrap to a new line.
  grid-template-rows: repeat(3, auto);
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  justify-content: space-around;
  gap: 10px 20px;
`;

const DatasetCard = styled.li`
  display: grid;
  grid-template-rows: subgrid;
  grid-row: span 3;
  min-width: 180px;
  padding: 5px;

  & > h4 {
    text-align: center;
    display: grid;
    margin: 0;
  }
  & > p {
    text-align: center;
    display: grid;
  }
  & > a {
    margin: auto;
    display: grid;
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

export default function LandingPage(): ReactElement {
  const theme = useContext(AppThemeContext);

  // TODO: Should the load buttons be link elements or buttons?
  // Currently both the link and the button inside can be tab-selected.
  const renderDataset = (dataset: DatasetEntry, index: number): ReactElement => {
    const viewerLink = "viewer" + paramsToUrlQueryString(dataset.loadParams);

    return (
      <DatasetCard key={index}>
        <h4>{dataset.name}</h4>
        <p>{dataset.description}</p>
        <Link to={viewerLink}>
          <Button type="primary">
            Load<VisuallyHidden> dataset {dataset.name}</VisuallyHidden>
          </Button>
        </Link>
      </DatasetCard>
    );
  };

  const renderProject = (project: ProjectEntry, index: number): ReactElement => {
    const projectNameElement = project.inReview ? (
      <FlexRow style={{ justifyContent: "space-between" }} $gap={10}>
        <h3>{project.name}</h3>
        <Tooltip title="Final version of dataset will be released when associated paper is published">
          <InReviewFlag>
            <p>IN REVIEW</p>
          </InReviewFlag>
        </Tooltip>
      </FlexRow>
    ) : (
      <h3>{project.name}</h3>
    );

    const publicationElement = project.publicationLink ? (
      <p>
        Related publication:{" "}
        <a
          href={project.publicationLink.toString()}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "var(--color-text-link)" }}
        >
          {project.publicationName}
          {/* Icon offset slightly to align with text */}
          <FontAwesomeIcon icon={faUpRightFromSquare} size="sm" style={{ marginBottom: "-1px", marginLeft: "3px" }} />
          <VisuallyHidden>(opens in new tab)</VisuallyHidden>
        </a>
      </p>
    ) : null;

    const loadButton = project.loadParams ? (
      <Link to={"viewer" + paramsToUrlQueryString(project.loadParams)}>
        <Button type="primary">
          Load<VisuallyHidden> dataset {project.name}</VisuallyHidden>
        </Button>
      </Link>
    ) : null;

    // TODO: Break up list of datasets when too long and hide under collapsible section.
    const datasetList = project.datasets ? <DatasetList>{project.datasets.map(renderDataset)}</DatasetList> : null;

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
      <Header />
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
        <ProjectList>{landingPageContent.map(renderProject)}</ProjectList>
      </ContentContainer>
    </>
  );
}
