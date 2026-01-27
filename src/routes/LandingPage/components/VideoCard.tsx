import React, { type ReactElement } from "react";

import { FlexColumn } from "src/styles/utils";
import type { VideoEntry } from "src/types";

type VideoCardProps = {
  entry: VideoEntry;
  index: number;
};

export default function VideoCard(props: VideoCardProps): ReactElement {
  const { entry, index } = props;

  return (
    <FlexColumn key={index} $gap={8}>
      <iframe
        title={entry.title}
        id={`ytplayer-${index}`}
        width="100%"
        style={{ aspectRatio: "16/9", border: 0 }}
        src={entry.videoUrl}
        allowFullScreen
        allow="picture-in-picture *; web-share *;"
        referrerPolicy="strict-origin"
      ></iframe>
      <h3 style={{ fontWeight: "600", margin: 0, marginTop: "-4px" }}>{entry.title}</h3>
      <p style={{ margin: 0 }}>{entry.description}</p>
    </FlexColumn>
  );
}
