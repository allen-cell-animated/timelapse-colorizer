import React, { ReactElement, useContext } from "react";

import { AppThemeContext } from "src/styles/AppStyle";
import { FlexColumn } from "src/styles/utils";
import { VideoEntry } from "src/types";

type VideoCardProps = {
  entry: VideoEntry;
  index: number;
};

export default function VideoCard(props: VideoCardProps): ReactElement {
  const theme = useContext(AppThemeContext);
  const { entry, index } = props;

  return (
    <FlexColumn key={index} $gap={10}>
      <div>
        <iframe
          title={entry.title}
          id="ytplayer"
          width="100%"
          style={{ aspectRatio: "16/9", background: theme.color.layout.backgroundMed }}
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
