import { Tooltip } from "antd";
import React, { type ReactElement } from "react";
import styled from "styled-components";

import { ButtonStyleLink } from "src/components/Buttons/ButtonStyleLink";
import { serializedDataToUrl, serializeViewerParams } from "src/state/utils/store_io";
import { ExternalLink, FlexRowAlignCenter, VisuallyHidden } from "src/styles/utils";
import type { ProjectEntry } from "src/types";

import DatasetList from "./DatasetList";

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
  const datasetList = project.datasets ? <DatasetList datasets={project.datasets} /> : null;

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
