import { DownloadOutlined } from "@ant-design/icons";
import { Tooltip } from "antd";
import React, { type ReactElement, useCallback, useState } from "react";

import { BOOLEAN_VALUE_FALSE, BOOLEAN_VALUE_TRUE } from "src/colorizer";
import { getSharedWorkerPool } from "src/colorizer/workers/SharedWorkerPool";
import IconButton from "src/components/Buttons/IconButton";
import LoadingSpinner from "src/components/LoadingSpinner";
import { useViewerStateStore } from "src/state";
import { downloadCsv } from "src/utils/file_io";

export default function DownloadDatasetButton(): ReactElement {
  const dataset = useViewerStateStore((state) => state.dataset);
  const datasetKey = useViewerStateStore((state) => state.datasetKey);
  const collection = useViewerStateStore((state) => state.collection);
  const inRangeLUT = useViewerStateStore((state) => state.inRangeLUT);

  const [isLoading, setIsLoading] = useState(false);

  const downloadDatasetCsv = useCallback(() => {
    if (!dataset || !collection || !datasetKey) {
      return;
    }
    setIsLoading(true);
    const name = collection.getDatasetName(datasetKey) || "dataset";
    const csvColumns = dataset.toCsvDataColumns();

    // Insert inRangeLUT as a column
    if (inRangeLUT.length > 0) {
      csvColumns.push({
        name: "Filtered",
        data: inRangeLUT,
        categories: [BOOLEAN_VALUE_FALSE, BOOLEAN_VALUE_TRUE],
      });
    }
    const workerPool = getSharedWorkerPool();

    const fetchDataAndDownload = async (): Promise<void> => {
      const csvString = await workerPool.getCsvString(csvColumns);
      downloadCsv(name, csvString);
      setIsLoading(false);
    };

    fetchDataAndDownload().finally(() => {
      setIsLoading(false);
    });
  }, [dataset, collection, datasetKey, inRangeLUT]);

  return (
    <Tooltip title="Download dataset as .csv">
      <div>
        <LoadingSpinner loading={isLoading} iconSize={18}>
          <IconButton
            type={isLoading ? "primary" : "link"}
            onClick={downloadDatasetCsv}
            disabled={!dataset || isLoading}
          >
            <DownloadOutlined />
          </IconButton>
        </LoadingSpinner>
      </div>
    </Tooltip>
  );
}
