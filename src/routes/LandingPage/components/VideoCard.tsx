import React, { ReactElement } from "react";

import { FlexColumn } from "src/styles/utils";
import { VideoEntry } from "src/types";

type VideoCardProps = {
  entry: VideoEntry;
  index: number;
};

export default function VideoCard(props: VideoCardProps): ReactElement {
  const { entry, index } = props;

  //<div style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%;"><iframe src="https://www.youtube.com/embed/cip80-n5CN8?rel=0" style="top: 0; left: 0; width: 100%; height: 100%; position: absolute; border: 0;" allowfullscreen scrolling="no" allow="accelerometer *; clipboard-write *; encrypted-media *; gyroscope *; picture-in-picture *; web-share *;" referrerpolicy="strict-origin"></iframe></div>
  return (
    <FlexColumn key={index} $gap={10}>
      <div>
        <iframe
          title={entry.title}
          id="ytplayer"
          width="100%"
          style={{ aspectRatio: "16/9" }}
          src={entry.videoUrl}
          frameBorder={0}
          allowFullScreen
          allow="picture-in-picture *; web-share *;"
          referrerPolicy="strict-origin"
        ></iframe>
      </div>
      <h3 style={{ fontWeight: "600", margin: 0 }}>{entry.title}</h3>
      <p style={{ margin: 0 }}>{entry.description}</p>
    </FlexColumn>
  );
}
