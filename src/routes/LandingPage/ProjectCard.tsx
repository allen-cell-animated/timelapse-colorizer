import { Tooltip } from "antd";
import React, { ReactElement } from "react";
import styled from "styled-components";

import { ButtonStyleLink } from "src/components/Buttons/ButtonStyleLink";
import { PageRoutes } from "src/routes";
import { serializedDataToUrl, serializeViewerParams } from "src/state/utils/store_io";
import { ExternalLink, FlexRowAlignCenter, VisuallyHidden } from "src/styles/utils";
import { DatasetEntry, ProjectEntry } from "src/types";

const ProjectContainer = styled.li`
  display: flex;
  width: 100%;
  flex-direction: column;
  gap: 10px;

  & h3 {
    font-weight: bold;
  }

  & p,
  & h2,
  & span {
    margin: 0;
  }

  & a {
    // Add 2px margin to maintain the same visual gap that text has
    margin: 2px 0 0 0;
    text-decoration: underline;
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
  text-align: start;
  gap: 0 20px;
`;

type ProjectCardProps = {
  project: ProjectEntry;
  index: number;
};

const InReviewFlag = styled(FlexRowAlignCenter)`
  border-radius: 4px;
  padding: 1px 6px;
  background-color: var(--color-flag-background);
  height: 22px;
  flex-wrap: wrap;

  & > p {
    color: var(--color-flag-text);
    font-size: 10px;
    font-weight: bold;
    white-space: nowrap;
  }
`;

const DatasetCard = styled.li`
  display: grid;
  grid-template-rows: subgrid;
  grid-row: span 3;
  min-width: 180px;
  align-items: flex-start;
  margin-top: 20px;

  & > h3 {
    display: grid;
    margin: 0;
  }
  & > p {
    display: grid;
  }
  & > a {
    // -1px left margin gives button visual alignment with text
    margin: 4px auto 0 -1px;
    display: grid;
  }
`;

// TODO: Should the load buttons be link elements or buttons?
// Currently both the link and the button inside can be tab-selected.
const renderDataset = (dataset: DatasetEntry, index: number): ReactElement => {
  const viewerLink = `${PageRoutes.VIEWER}?${serializedDataToUrl(serializeViewerParams(dataset.loadParams))}`;

  return (
    <DatasetCard key={index}>
      <h3>{dataset.name}</h3>
      <p>{dataset.description}</p>
      <ButtonStyleLink to={viewerLink}>
        Load<VisuallyHidden> dataset {dataset.name}</VisuallyHidden>
      </ButtonStyleLink>
    </DatasetCard>
  );
};

export default function ProjectCard(props: ProjectCardProps): ReactElement {
  const { project, index } = props;

  const projectNameElement = project.inReview ? (
    <FlexRowAlignCenter $gap={10}>
      <h2>{project.name}</h2>
      <Tooltip title="Final version of dataset will be released when associated paper is published">
        <InReviewFlag>
          <p>IN REVIEW</p>
        </InReviewFlag>
      </Tooltip>
    </FlexRowAlignCenter>
  ) : (
    <h2>{project.name}</h2>
  );

  const publication = project.publicationInfo;
  const publicationElement = publication ? (
    <p>
      Related publication: <ExternalLink href={publication.url.toString()}>{publication.name}</ExternalLink> (
      {publication.citation})
    </p>
  ) : null;

  const loadButton = project.loadParams ? (
    <ButtonStyleLink to={"viewer?" + serializedDataToUrl(serializeViewerParams(project.loadParams))}>
      Load<VisuallyHidden> dataset {project.name}</VisuallyHidden>
    </ButtonStyleLink>
  ) : null;

  // TODO: Break up list of datasets when too long and hide under collapsible section.
  const datasetList = project.datasets ? <DatasetList>{project.datasets.map(renderDataset)}</DatasetList> : null;

  return (
    <ProjectContainer key={index}>
      {projectNameElement}
      <p>{project.description}</p>
      {publicationElement}
      {loadButton}
      {datasetList}
    </ProjectContainer>
  );
}
