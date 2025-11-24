import { Carousel, ConfigProvider } from "antd";
import React, { type ReactElement, useContext, useEffect, useRef, useState } from "react";
import styled from "styled-components";

import VideoCard from "src/routes/LandingPage/components/VideoCard";
import { AppThemeContext } from "src/styles/AppStyle";
import type { VideoEntry } from "src/types";

type VideoListProps = {
  videoEntries: VideoEntry[];
};

const DEFAULT_LANDING_PAGE_CONTENT_WIDTH_PX = 1060;
const THREE_SLIDES_BREAKPOINT_PX = 1025;
const TWO_SLIDES_BREAKPOINT_PX = 700;

const StyledCarousel = styled(Carousel)`
  .slick-list {
    /* Add padding so controls don't overlap text */
    padding-bottom: 20px;

    /* Add gap between each element */
    & .slick-slide > div > div {
      padding: 0 10px;
    }
  }

  /* Adjust arrow colors to be visible against background*/
  & .slick-arrow {
    color: var(--color-text-secondary);
    top: 40%;
  }
`;

export default function VideoList(props: VideoListProps): ReactElement {
  const theme = useContext(AppThemeContext);

  // Track container width to adjust number of visible slides
  const divContainerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(DEFAULT_LANDING_PAGE_CONTENT_WIDTH_PX);
  useEffect(() => {
    const onWidthChange = (): void => {
      if (divContainerRef.current) {
        setContainerWidth(divContainerRef.current.offsetWidth);
      }
    };
    window.addEventListener("resize", onWidthChange);
    onWidthChange();
    return () => {
      window.removeEventListener("resize", onWidthChange);
    };
  }, []);

  // These breakpoints were chosen to keep high-res thumbnails (YouTube embeds
  // will switch to a low-res thumbnail if the width is below ~320px).
  let numSlidesToShow;
  if (containerWidth >= THREE_SLIDES_BREAKPOINT_PX) {
    numSlidesToShow = 3;
  } else if (containerWidth >= TWO_SLIDES_BREAKPOINT_PX) {
    numSlidesToShow = 2;
  } else {
    numSlidesToShow = 1;
  }

  return (
    <div ref={divContainerRef}>
      <ConfigProvider
        theme={{
          components: {
            Carousel: {
              colorBgContainer: theme.color.text.secondary,
              // Position arrows outside of carousel
              arrowSize: 20,
              arrowOffset: -20,
              // Increase dot size, put at bottom edge to avoid overlapping text
              dotHeight: 5,
              dotOffset: 0,
            },
          },
        }}
      >
        <StyledCarousel arrows={true} infinite={false} slidesToShow={numSlidesToShow} style={{ gap: "20px" }}>
          {props.videoEntries.map((videoEntry, index) => {
            return <VideoCard key={index} entry={videoEntry} index={index} />;
          })}
        </StyledCarousel>
      </ConfigProvider>
    </div>
  );
}
