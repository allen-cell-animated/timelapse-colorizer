import { DownloadOutlined } from "@ant-design/icons";
import { Tooltip } from "antd";
import type { NotificationInstance } from "antd/es/notification/interface";
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

  const [isDownloadPending, setIsDownloadPending] = useState(false);

  const hasLoadedData = collection && datasetKey && dataset;

  const showErrorNotification = useCallback(
    (err: unknown) => {
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
    },
    [props.notificationApi, theme]
  );

  const downloadDatasetCsv = useCallback(() => {
    if (!hasLoadedData) {
      return;
    }
    setIsDownloadPending(true);
    const name = collection.getDatasetName(datasetKey) || "dataset";
    const csvColumns = dataset.toCsvDataColumns();

    // Insert filtered status as a column
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
      .catch(showErrorNotification)
      .finally(() => {
        setIsDownloadPending(false);
      });
  }, [dataset, collection, datasetKey, hasLoadedData, inRangeLUT, showErrorNotification]);

  return (
    <Tooltip title="Download dataset as .csv">
      <div>
        <LoadingSpinner loading={isDownloadPending} iconSize={18}>
          <IconButton
            type={isDownloadPending ? "primary" : "link"}
            onClick={downloadDatasetCsv}
            disabled={!hasLoadedData || isDownloadPending}
          >
            <DownloadOutlined />
          </IconButton>
        </LoadingSpinner>
      </div>
    </Tooltip>
  );
}
