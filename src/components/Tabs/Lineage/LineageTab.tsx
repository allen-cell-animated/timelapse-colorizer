import React, { ReactElement, useEffect, useMemo, useRef, useState } from "react";

import { useViewerStateStore } from "src/state";
import { FlexColumn, FlexRow } from "src/styles/utils";

import { getLineageData } from "./lineage_utils";
import * as force from "./views/force";
import * as tree from "./views/tree";

type LineageTabProps = {};
const defaultProps: Partial<LineageTabProps> = {};

const enum LayoutMode {
  TREE = "tree",
  FORCE = "force",
}

export default function LineageTab(inputProps: LineageTabProps): ReactElement {
  const props = { ...defaultProps, ...inputProps } as Required<LineageTabProps>;

  const containerRef = useRef<HTMLDivElement>(null);
  const [layoutMode, setLayoutMode] = useState(LayoutMode.TREE);

  const dataset = useViewerStateStore((state) => state.dataset);
  const lineageData = useMemo(() => {
    return dataset ? getLineageData(dataset) : undefined;
  }, [dataset]);

  useEffect(() => {
    if (containerRef.current && lineageData) {
      if (layoutMode === LayoutMode.FORCE) {
        force.render(containerRef.current, lineageData);
        return () => {
          force.teardown(containerRef.current!);
        };
      } else {
        tree.render(containerRef.current, lineageData);
        return () => {
          tree.teardown(containerRef.current!);
        };
      }
    }
    return undefined;
  }, [lineageData, layoutMode]);

  return (
    <FlexColumn style={{ width: "100%", height: "100%" }}>
      <FlexRow></FlexRow>

      <div ref={containerRef} style={{ width: "100%", height: "calc(100% - 40px)" }}>
        {lineageData?.edges.length === 0 && (
          <div style={{ textAlign: "center", marginTop: "20px" }}>No lineage data available.</div>
        )}
      </div>
    </FlexColumn>
  );
}
