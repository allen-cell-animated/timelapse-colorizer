import React, { ReactElement, useEffect, useRef } from "react";

import { Dataset, Track } from "../../colorizer";

type Plot3DTabProps = {
  dataset: Dataset;
  selectedTrack: Track | null;
  currentFrame: number;
};

class Plot3d {
  public parentRef: HTMLElement;
  public dataset: Dataset | null;
  public trace: Plotly.Data | null;

  constructor(parentRef: HTMLElement) {
    this.dataset = null;
    this.trace = null;
    this.parentRef = parentRef;
  }
}

export default function Plot3dTab(props: Plot3DTabProps): ReactElement {
  const plotContainer = useRef<HTMLDivElement>(null);
  const plot3d = useRef<Plot3d | null>(null);

  useEffect(() => {
    plot3d.current = new Plot3d(plotContainer.current!);
  });

  return <></>;
}
