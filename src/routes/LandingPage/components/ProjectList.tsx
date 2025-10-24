import React, { type ReactElement } from "react";
import styled from "styled-components";

import type { ProjectEntry } from "src/types";

import ProjectCard from "./ProjectCard";

type ProjectListProps = {
  projects: ProjectEntry[];
};

const ProjectListContainer = styled.ul`
  display: flex;
  flex-direction: column;
  gap: 30px;
  padding: 0;
  margin-top: 0;

  // Add a pseudo-element line between cards
  & > li:not(:first-child)::before {
    content: "";
    display: block;
    width: 100%;
    height: 1px;
    background-color: var(--color-borders);
    margin-bottom: 15px;
  }
`;

export default function ProjectList(props: ProjectListProps): ReactElement {
  return (
    <ProjectListContainer>
      {props.projects.map((project, index) => (
        <ProjectCard key={index} project={project} index={index} />
      ))}
    </ProjectListContainer>
  );
}
