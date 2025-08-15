import { Button, Divider, Tooltip } from "antd";
import React, { lazy, ReactElement, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";

import { Dataset } from "../colorizer";
import { serializedDataToUrl, serializeViewerParams } from "../state/utils/store_io";
import { ExternalLink, FlexColumn, FlexColumnAlignCenter, FlexRowAlignCenter, VisuallyHidden } from "../styles/utils";
import { DatasetEntry, LocationState, ProjectEntry } from "../types";
import { PageRoutes } from "./index";

import Collection from "../colorizer/Collection";
import { ButtonStyleLink } from "../components/Buttons/ButtonStyleLink";
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

const BannerTextContainer = styled(FlexColumn)`
  max-width: calc(1060px);
  width: calc(90vw - 40px);
  padding: 30px 0;

  & > div {
    // Inner container is sized smaller
    max-width: calc(min(775px, 70vw));

    & > h1 {
      margin-top: 0;
    }

    & > p {
      font-size: var(--font-size-label);
    }
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
    font-weight: bold;
  }
`;

const LoadPromptContainer = styled(FlexColumnAlignCenter)`
  background-color: var(--color-background-alt);
  margin: 30px 0;
  padding: 30px 0;

  & > h2 {
    margin: auto;
    max-width: calc(90vw - 40px);
  }
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

const CookieSettingsButton = styled(Button)`
  color: var(--color-text-secondary);
  &:focus-visible > span,
  &:hover > span {
    text-decoration: underline;
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
          <FlexColumn $gap={10}>
            <h1 style={{ marginBottom: 0 }}>An interactive, web-based viewer for segmented timelapse data</h1>
            <p>
              Designed for biomedical researchers and data professionals, <b>Timelapse Feature Explorer</b> provides
              intuitive tools for exploring and analyzing dynamic datasets.
            </p>
          </FlexColumn>
        </BannerTextContainer>
      </Banner>

      <ContentContainer>
        <FeatureHighlightsContainer>
          <FeatureHighlightsItem>
            <h3>Explore your data</h3>
            <p>Zoom, pan, and apply colormaps to observe patterns and trends with fast, responsive playback.</p>
          </FeatureHighlightsItem>
          <FeatureHighlightsItem>
            <h3>Plot anything</h3>
            <p>Use integrated plots to understand dynamics in one track-- or all of them.</p>
          </FeatureHighlightsItem>
          <FeatureHighlightsItem>
            <h3>Annotate everything</h3>
            <p>Label segmentations or flag errors in a few clicks, with easy CSV export to update your data.</p>
          </FeatureHighlightsItem>
          <FeatureHighlightsItem>
            <h3>Share with anyone</h3>
            <p>Save videos and images in seconds, or share links to give collaborators the same interactive view.</p>
          </FeatureHighlightsItem>
        </FeatureHighlightsContainer>
      </ContentContainer>

      <LoadPromptContainer>
        <h2 style={{ margin: 0 }}>Load a dataset below or your own data to get started</h2>
      </LoadPromptContainer>

      <ContentContainer style={{ paddingBottom: "400px" }}>
        <ProjectList>{landingPageContent.map(renderProject)}</ProjectList>
      </ContentContainer>

      <ContentContainer style={{ padding: "0 30px 40px 30px" }}>
        <Divider />
        <FlexColumnAlignCenter style={{ paddingTop: "40px" }}>
          <CookieSettingsButton type="text" className="ot-sdk-show-settings">
            Cookie settings
            <VisuallyHidden>(opens popup menu)</VisuallyHidden>
          </CookieSettingsButton>
        </FlexColumnAlignCenter>
      </ContentContainer>
    </>
  );
}
