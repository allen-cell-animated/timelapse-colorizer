import { Carousel, ConfigProvider } from "antd";
import React, { type ReactElement, useContext, useEffect, useRef, useState } from "react";
import styled from "styled-components";

import VideoCard from "src/routes/LandingPage/components/VideoCard";
import { AppThemeContext } from "src/styles/AppStyle";
import type { VideoEntry } from "src/types";

type VideoListProps = {
  videoEntries: VideoEntry[];
};

const StyledCarousel = styled(Carousel)`
  .slick-list {
    /* Add padding so controls don't overlap text */
    padding-bottom: 20px;

    & .slick-slide > div > div {
      /* Prevent text selection so scrolling works */
      user-select: none;
      -ms-user-select: none;
      -moz-user-select: none;
      -webkit-user-select: none;
    }

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
  const divContainerRef = useRef<HTMLDivElement>(null);

  const [containerWidth, setContainerWidth] = useState<number>(1060);

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

  // Adjust number of visible slides based on container width. These breakpoints
  // were chosen to keep the video thumbnails at a higher resolution.
  let numSlidesToShow;
  if (containerWidth >= 1025) {
    numSlidesToShow = 3;
  } else if (containerWidth >= 700) {
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
        <StyledCarousel
          arrows={true}
          infinite={false}
          draggable={true}
          slidesToShow={numSlidesToShow}
          style={{ gap: "20px" }}
        >
          {props.videoEntries.map((videoEntry, index) => {
            return <VideoCard key={index} entry={videoEntry} index={index} />;
          })}
        </StyledCarousel>
      </ConfigProvider>
    </div>
  );
}
