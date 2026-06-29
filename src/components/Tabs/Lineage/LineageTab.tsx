import React, { ReactElement, useMemo } from "react";

import { useViewerStateStore } from "src/state";

import { getLineageData } from "./lineage_utils";

type LineageTabProps = {};
const defaultProps: Partial<LineageTabProps> = {};

export default function LineageTab(inputProps: LineageTabProps): ReactElement {
  const props = { ...defaultProps, ...inputProps } as Required<LineageTabProps>;

  const dataset = useViewerStateStore((state) => state.dataset);
  const lineageData = useMemo(() => {
    return dataset ? getLineageData(dataset) : undefined;
  }, [dataset]);

  return <></>;
}
