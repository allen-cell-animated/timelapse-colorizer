import { DownloadOutlined } from "@ant-design/icons";
import { Tooltip } from "antd";
import { NotificationInstance } from "antd/es/notification/interface";
import React, { type ReactElement, useCallback, useContext, useState } from "react";

import { BOOLEAN_VALUE_FALSE, BOOLEAN_VALUE_TRUE, CSV_COL_FILTERED } from "src/colorizer";
import { getSharedWorkerPool } from "src/colorizer/workers/SharedWorkerPool";
import IconButton from "src/components/Buttons/IconButton";
import LoadingSpinner from "src/components/LoadingSpinner";
import { useViewerStateStore } from "src/state";
import { AppThemeContext } from "src/styles/AppStyle";
import { downloadCsv } from "src/utils/file_io";

type DownloadDatasetButtonProps = {
  notificationApi: NotificationInstance;
};

export default function DownloadDatasetButton(props: DownloadDatasetButtonProps): ReactElement {
  const theme = useContext(AppThemeContext);

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
        name: CSV_COL_FILTERED,
        data: inRangeLUT,
        categories: [BOOLEAN_VALUE_FALSE, BOOLEAN_VALUE_TRUE],
      });
    }
    const workerPool = getSharedWorkerPool();

    const generateAndDownloadCsv = async (): Promise<void> => {
      const csvString = await workerPool.getCsvString(csvColumns);
      downloadCsv(name, csvString);
    };

    generateAndDownloadCsv()
      .catch((err) => {
        console.error("Could not download dataset CSV: ", err);
        props.notificationApi.error({
          message: "Dataset download failed",
          description:
            "An error occurred while downloading the dataset: " + (err instanceof Error ? err.message : String(err)),
          placement: "bottomLeft",
          duration: 12,
          style: {
            backgroundColor: theme.color.alert.fill.error,
            border: `1px solid ${theme.color.alert.border.error}`,
          },
        });
      })
      .finally(() => {
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
            disabled={!dataset || !collection || !datasetKey || isLoading}
          >
            <DownloadOutlined />
          </IconButton>
        </LoadingSpinner>
      </div>
    </Tooltip>
  );
}
