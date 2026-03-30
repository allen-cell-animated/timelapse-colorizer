import { Button, Divider } from "antd";
import React, { lazy, type ReactElement, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";

import type { Dataset } from "src/colorizer";
import type Collection from "src/colorizer/Collection";
import HelpDropdown from "src/components/Dropdowns/HelpDropdown";
import Header from "src/components/Header";
import LoadDatasetButton from "src/components/LoadDatasetButton";
import { PageRoutes } from "src/routes";
import { FlexColumn, FlexColumnAlignCenter, FlexRowAlignCenter, VisuallyHidden } from "src/styles/utils";
import type { LocationState } from "src/types";

import ProjectList from "./components/ProjectList";
import { LANDING_PAGE_CONTENT } from "./constants";

const BannerVideo = lazy(() => import("src/components/AssetWrappers/BannerVideo"));

const Banner = styled(FlexColumnAlignCenter)`
  position: relative;
  --container-padding-x: 20px;
  padding: 30px var(--container-padding-x);
  overflow: hidden;
  margin: 0;
`;

const BannerTextContainer = styled(FlexColumn)`
  max-width: 1060px;
  width: calc(90vw - 40px);
  padding: 30px 0;

  & > div {
    // Text does not take full width to leave the right section clear (where
    // animated video is playing)
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
            <p>Label segmentations or flag errors in a few clicks, then export to update your data.</p>
          </FeatureHighlightsItem>
          <FeatureHighlightsItem>
            <h3>Share with anyone</h3>
            <p>Save videos and images in seconds, or share a link to give to collaborators.</p>
          </FeatureHighlightsItem>
        </FeatureHighlightsContainer>
      </ContentContainer>

      <LoadPromptContainer>
        <h2 style={{ margin: 0 }}>Load a dataset below or your own data to get started</h2>
      </LoadPromptContainer>

      <ContentContainer style={{ paddingBottom: "400px" }}>
        <ProjectList projects={LANDING_PAGE_CONTENT} />
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
