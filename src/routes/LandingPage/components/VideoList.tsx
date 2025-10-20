import React, { ReactElement } from "react";
import styled from "styled-components";

import VideoCard from "src/routes/LandingPage/components/VideoCard";
import { VideoEntry } from "src/types";

type VideoListProps = {
  videoEntries: VideoEntry[];
};

const VideoListContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(340px, 0.5fr));
  grid-gap: 20px;
  grid-row-gap: 30px;
`;

export default function VideoList(props: VideoListProps): ReactElement {
  return (
    <VideoListContainer>
      {props.videoEntries.map((videoEntry, index) => {
        return <VideoCard key={index} entry={videoEntry} index={index} />;
      })}
    </VideoListContainer>
  );
}
