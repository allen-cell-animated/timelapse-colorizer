import { UploadOutlined } from "@ant-design/icons";
import { Button } from "antd";
import React, { ReactElement, ReactNode, useCallback, useMemo, useState } from "react";

import { zipToFileMap } from "../colorizer/utils/data_load_utils";
import { useJsxText } from "../hooks/useJsxText";
import { useViewerStateStore } from "../state";
import { FlexColumn, FlexColumnAlignCenter, FlexRowAlignCenter } from "../styles/utils";
import { formatQuantityString } from "../utils/formatting";

import Collection from "../colorizer/Collection";
import { ButtonStyleLink } from "./Buttons/ButtonStyleLink";
import ExpandableList from "./ExpandableList";
import FileInfoCard from "./Inputs/FileInfoCard";
import { StyledUpload } from "./Inputs/StyledUpload";
import LoadingSpinner from "./LoadingSpinner";
import StyledModal from "./Modals/StyledModal";

type LoadFileModalProps = {
  sourceFilename: string;
  targetDataset: string | null;
  onLoad: (collection: Collection) => void;
  onClose: () => void;
  open: boolean;
};

/**
 * Prompts a user to reload a collection from a ZIP file.
 */
export default function LoadFileModal(props: LoadFileModalProps): ReactElement {
  const setSourceFilename = useViewerStateStore((state) => state.setSourceFilename);

  const [isLoadingZip, setIsLoadingZip] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedCollection, setUploadedCollection] = useState<Collection | null>(null);
  const [errorText, setErrorText] = useJsxText(null);

  const [loadProgress, setLoadProgress] = useState(0);

  const onZipUpload = useCallback(
    async (zipFile: File): Promise<boolean> => {
      if (isLoadingZip) {
        return false;
      }
      setErrorText(null);
      setUploadedFile(zipFile);
      setIsLoadingZip(true);
      setLoadProgress(0);
      const handleProgressUpdate = (complete: number, total: number): void => {
        setLoadProgress(Math.floor((complete / total) * 100));
      };
      const fileMap = await zipToFileMap(zipFile, handleProgressUpdate);
      if (Object.keys(fileMap).length === 0) {
        setErrorText("No files found in ZIP file.");
        return false;
      }
      const didLoadCollection = await Collection.loadFromAmbiguousFile(zipFile.name, fileMap, {})
        .then((result) => {
          setUploadedCollection(result);
          return true;
        })
        .catch((reason) => {
          // failed
          setErrorText(reason.toString() || "An unknown error occurred while loading the ZIP file.");
          return false;
        });
      setIsLoadingZip(false);
      return didLoadCollection;
    },
    [isLoadingZip, setErrorText, setIsLoadingZip, setSourceFilename, setLoadProgress, props.onLoad]
  );

  //// Rendering ////

  const collectionInfo = useMemo((): ReactNode => {
    if (uploadedCollection === null) {
      return null;
    }

    // Display a list of all the datasets in the collection
    const datasetCount = uploadedCollection.getDatasetKeys().length;
    return (
      <FlexColumn>
        <p>Contains {formatQuantityString(datasetCount, "dataset", "datasets")}:</p>
        <ExpandableList collapsedHeightPx={66} expandedMaxHeightPx={300} buttonStyle={{ marginLeft: "15px" }}>
          <ol style={{ margin: "0", paddingLeft: "30px" }}>
            {uploadedCollection.getDatasetKeys().map((key, index) => {
              return (
                <li key={index}>
                  <span>{uploadedCollection.getDatasetName(key)}</span>
                </li>
              );
            })}
          </ol>
        </ExpandableList>
      </FlexColumn>
    );
  }, [uploadedCollection]);

  const collectionWarning = useMemo((): ReactNode => {
    if (props.targetDataset === null || uploadedCollection === null) {
      return null;
    }
    // Check if the collection has a matching dataset
    let hasMatchingDataset = false;
    for (const datasetKey of uploadedCollection.getDatasetKeys()) {
      if (datasetKey === props.targetDataset) {
        hasMatchingDataset = true;
        break;
      }
    }
    if (hasMatchingDataset) {
      return null;
    }
    return (
      <p>
        The .zip file is missing the dataset <b>{props.targetDataset}.</b> Some settings may be lost.
      </p>
    );
  }, [uploadedCollection, props.targetDataset]);

  return (
    <StyledModal title={"Reload dataset"} open={props.open} footer={null} onCancel={props.onClose}>
      <FlexColumn $gap={10}>
        <FlexColumn style={{ wordWrap: "break-word", wordBreak: "break-all" }}>
          <p style={{ margin: "0" }}>To continue, please reload the dataset from a .zip file.</p>
          <p>
            Previous file: <b>{props.sourceFilename}</b>
          </p>
        </FlexColumn>
        <LoadingSpinner loading={isLoadingZip} progress={loadProgress} iconSize={64}>
          {uploadedCollection || errorText ? (
            <FileInfoCard
              fileName={uploadedFile?.name ?? ""}
              onClickClear={() => {
                setUploadedCollection(null);
                setErrorText("");
                setUploadedFile(null);
              }}
              errorText={errorText}
              warningText={collectionWarning}
            >
              {collectionInfo}
            </FileInfoCard>
          ) : (
            <StyledUpload
              name={props.sourceFilename}
              multiple={false}
              accept=".zip"
              showUploadList={false}
              beforeUpload={onZipUpload}
              disabled={isLoadingZip}
            >
              {/* 121 px is a magic number that matches the size of the info card when file is missing */}
              <FlexColumnAlignCenter style={{ height: "121px", justifyContent: "center" }}>
                <span>
                  <UploadOutlined />
                </span>
                <p>Click or drag a .zip file here to upload</p>
              </FlexColumnAlignCenter>
            </StyledUpload>
          )}
        </LoadingSpinner>
        <FlexRowAlignCenter $gap={10} style={{ justifyContent: "flex-end" }}>
          <ButtonStyleLink to="/" type="outlined">
            Go to homepage
          </ButtonStyleLink>
          <Button
            disabled={!uploadedCollection}
            onClick={() => {
              if (uploadedCollection) {
                setSourceFilename(uploadedFile!.name);
                props.onLoad(uploadedCollection);
              }
            }}
            type="primary"
          >
            Load
          </Button>
        </FlexRowAlignCenter>
      </FlexColumn>
    </StyledModal>
  );
}
