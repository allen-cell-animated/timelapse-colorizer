import { faUpRightFromSquare } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Button, Tooltip } from "antd";
import React, { lazy, ReactElement, Suspense } from "react";
import { Link, useNavigate } from "react-router-dom";
import styled from "styled-components";

import { Dataset } from "../colorizer";
import { paramsToUrlQueryString } from "../colorizer/utils/url_utils";
import { FlexColumn, FlexColumnAlignCenter, FlexRowAlignCenter, VisuallyHidden } from "../styles/utils";
import { DatasetEntry, LocationState, ProjectEntry } from "../types";
import { PageRoutes } from "./index";

import Collection from "../colorizer/Collection";
import HelpDropdown from "../components/Dropdowns/HelpDropdown";
import Header from "../components/Header";
import LoadDatasetButton from "../components/LoadDatasetButton";
import { landingPageContent } from "./LandingPageContent";

const BannerVideo = lazy(() => import("../components/AssetWrappers/BannerVideo"));

const Banner = styled(FlexColumnAlignCenter)`
  position: relative;
  --container-padding-x: 20px;
  padding: 30px var(--container-padding-x);
  overflow: hidden;
  margin: 0;
`;

const BannerTextContainer = styled(FlexColumnAlignCenter)`
  --padding-x: 30px;
  padding: var(--padding-x);
  max-width: calc(1060px - 2 * var(--padding-x));

  --total-padding-x: calc(2 * var(--padding-x) + 2 * var(--container-padding-x));
  width: calc(90vw - var(--total-padding-x));
  border-radius: 5px;
  // Fallback in case color-mix is unsupported.
  background-color: var(--color-background);
  // Make the background slightly transparent. Note that this may fail on internet explorer.
  background-color: color-mix(in srgb, var(--color-background) 80%, transparent);
  box-shadow: 0 4px 4px rgba(0, 0, 0, 0.3);
  gap: 10px;

  & > h1 {
    margin-top: 0;
  }

  & > p {
    font-size: var(--font-size-label);
  }
`;

const BannerVideoContainer = styled.div`
  position: absolute;
  top: 0;
  right: 0;
  width: 100%;
  height: 100%;
  background-color: #ded9ef;
  z-index: -1;

  & > video {
    width: 100%;
    height: 100%;
    object-fit: cover;
    // Fixes a bug where a single pixel black outline would appear around the video.
    clip-path: inset(1px 1px);
  }
`;

const ContentContainer = styled(FlexColumn)`
  max-width: 1060px;
  width: calc(90vw - 40px);
  margin: auto;
`;

const FeatureHighlightsContainer = styled.li`
  display: grid;
  width: 100%;
  grid-template-rows: repeat(2, auto);
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  padding: 0;
  justify-content: space-evenly;
  gap: 20px;
  margin: 30px 0 0 0;
`;

const FeatureHighlightsItem = styled(FlexColumn)`
  display: grid;
  grid-template-rows: subgrid;
  grid-row: span 2;

  & > h3 {
    font-weight: 600;
  }
`;

const LoadPromptContainer = styled(FlexColumnAlignCenter)`
  background-color: var(--color-background-alt);
  // The 20px margin on the top is required because of the 20px row gap after the FeatureHighlightsContainer
  margin: 30px 0;
  padding: 30px;
`;

const ProjectList = styled.ul`
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

const ProjectCard = styled.li`
  display: flex;
  width: 100%;
  flex-direction: column;
  gap: 0px;

  & h3 {
    font-weight: 600;
  }

  & p,
  & h2,
  & span {
    margin: 0;
  }

  & a {
    // Add 2px margin to maintain the same visual gap that text has
    margin: 2px 0 0 0;
  }
`;

const DatasetList = styled.ol`
  padding: 0;
  width: 100%;
  display: grid;
  margin-top: 4px;
  // Use grid + subgrid to align the title, description, and button for each horizontal
  // row of cards. repeat is used to tile the layout if the cards wrap to a new line.
  grid-template-rows: repeat(3, auto);
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  justify-content: space-around;
  text-align: start;
  gap: 0 20px;
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
    // -1px left margin gives visual alignment with text
    margin: 4px auto 0 -1px;
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
  const navigate = useNavigate();

  // Behavior

  const onDatasetLoad = (collection: Collection, datasetKey: string, _newDataset: Dataset): void => {
    // Unfortunately we can't pass the dataset directly through the `navigate` `state` API due to
    // certain Dataset state (like HTMLImageElement objects) being non-serializable. This means that the
    // dataset will be loaded twice, once here and once in the viewer.
    // Dataset loading is relatively fast and the browser should cache most of the loaded data so it
    // should hopefully not be a performance issue.
    // TODO: Pass dataset directly here?
    navigate(PageRoutes.VIEWER, { state: { collection: collection, datasetKey: datasetKey } as LocationState });
  };

  // Rendering

  // TODO: Should the load buttons be link elements or buttons?
  // Currently both the link and the button inside can be tab-selected.
  const renderDataset = (dataset: DatasetEntry, index: number): ReactElement => {
    const viewerLink = `${PageRoutes.VIEWER}${paramsToUrlQueryString(dataset.loadParams)}`;

    return (
      <DatasetCard key={index}>
        <h3>{dataset.name}</h3>
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
      <Header>
        <FlexRowAlignCenter $gap={15} $wrap="wrap">
          <LoadDatasetButton onLoad={onDatasetLoad} currentResourceUrl={""} />
          <HelpDropdown />
        </FlexRowAlignCenter>
      </Header>
      <Banner>
        <BannerVideoContainer>
          <Suspense fallback={<></>}>
            {/* Wrap in lazy + suspense so that the video doesn't block loading of the main page. TODO: transition*/}
            <BannerVideo />
          </Suspense>
        </BannerVideoContainer>
        <BannerTextContainer>
          <h1>Welcome to Timelapse Feature Explorer</h1>
          <p>
            The Timelapse Feature Explorer is a web-based application designed for the interactive visualization and
            analysis of segmented time-series microscopy data. Ideal for biomedical researchers and other data
            professionals, it offers an intuitive set of tools for scientific research and deeper understanding of
            dynamic datasets.
          </p>
        </BannerTextContainer>
      </Banner>

      <ContentContainer>
        <FeatureHighlightsContainer>
          <FeatureHighlightsItem>
            <h3>Dynamic color mapping</h3>
            <p>Customizable colormaps to understand patterns and trends within time lapse data.</p>
          </FeatureHighlightsItem>
          <FeatureHighlightsItem>
            <h3>Interactive data exploration</h3>
            <p>Easily switch between features for focused analysis or comparing different datasets.</p>
          </FeatureHighlightsItem>
          <FeatureHighlightsItem>
            <h3>Temporal navigation controls</h3>
            <p>
              Feature-rich playback controls to observe motion and dynamics over time, revealing trends and anomalies.
            </p>
          </FeatureHighlightsItem>
          <FeatureHighlightsItem>
            <h3>Feature extraction and visualization</h3>
            <p>
              Integrated plots show feature evolution, outliers, clusters and other patterns facilitating a nuanced
              understanding of temporal dynamics.
            </p>
          </FeatureHighlightsItem>
        </FeatureHighlightsContainer>
      </ContentContainer>

      <LoadPromptContainer>
        <h2 style={{ margin: 0 }}>Load dataset(s) below or your own data to get started</h2>
      </LoadPromptContainer>

      <ContentContainer style={{ paddingBottom: "400px" }}>
        <ProjectList>{landingPageContent.map(renderProject)}</ProjectList>
      </ContentContainer>
    </>
  );
}
