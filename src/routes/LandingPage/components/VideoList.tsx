import React, { ReactElement } from "react";
import styled from "styled-components";

import VideoCard from "src/routes/LandingPage/components/VideoCard";
import { VideoEntry } from "src/types";

type VideoListProps = {
  videoEntries: VideoEntry[];
};

const VideoListContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
  grid-gap: 20px;
`;

export default function VideoList(props: VideoListProps): ReactElement {
  return (
    <VideoListContainer>
      {props.videoEntries.map((videoEntry, index) => (
        <VideoCard entry={videoEntry} index={index} />
      ))}
    </VideoListContainer>
  );
}
