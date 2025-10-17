import { UploadOutlined } from "@ant-design/icons";
import { Button } from "antd";
import React, { ReactElement, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";

import Collection from "src/colorizer/Collection";
import { zipToFileMap } from "src/colorizer/utils/data_load_utils";
import { ButtonStyleLink } from "src/components/Buttons/ButtonStyleLink";
import ExpandableList from "src/components/ExpandableList";
import FileInfoCard from "src/components/Inputs/FileInfoCard";
import { StyledUpload } from "src/components/Inputs/StyledUpload";
import LoadingSpinner from "src/components/LoadingSpinner";
import StyledModal from "src/components/Modals/StyledModal";
import { useJsxText } from "src/hooks/useJsxText";
import { useViewerStateStore } from "src/state";
import { FlexColumn, FlexColumnAlignCenter, FlexRowAlignCenter } from "src/styles/utils";
import { formatQuantityString } from "src/utils/formatting";

type LoadZipModalProps = {
  sourceZipName: string;
  targetDataset: string | null;
  onLoad: (collection: Collection) => void;
  onClose: () => void;
  open: boolean;
};

/**
 * Prompts a user to reload a collection from a ZIP file.
 */
export default function LoadZipModal(props: LoadZipModalProps): ReactElement {
  const setSourceZipName = useViewerStateStore((state) => state.setSourceZipName);

  const isOpenRef = useRef(props.open);
  isOpenRef.current = props.open;

  const [isLoadingZip, setIsLoadingZip] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedCollection, setUploadedCollection] = useState<Collection | null>(null);
  const [errorText, setErrorText] = useJsxText(null);

  const [loadProgress, setLoadProgress] = useState(0);

  const clearState = useCallback((): void => {
    setIsLoadingZip(false);
    setUploadedCollection(null);
    setErrorText("");
    setUploadedFile(null);
    setLoadProgress(0);
  }, []);

  // Reset state when modal is closed.
  useEffect(() => {
    if (!props.open) {
      clearState();
    }
  }, [clearState, props.open]);

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
      let fileMap: Record<string, File> = {};
      try {
        fileMap = await zipToFileMap(zipFile, handleProgressUpdate);
      } catch (error) {
        setErrorText(error instanceof Error ? error.message : String(error));
        setIsLoadingZip(false);
        return false;
      }
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
    [isLoadingZip, setErrorText, setIsLoadingZip, setLoadProgress, props.onLoad]
  );

  // Because ZIP file parsing is async, it's possible for the modal to be closed
  // while the upload is still in progress. If this happens, clear state so the
  // Collection and File contents don't persist in memory.
  const wrappedOnZipUpload = useCallback(
    async (zipFile: File): Promise<boolean> => {
      const result = await onZipUpload(zipFile);
      if (!isOpenRef.current) {
        clearState();
        return false;
      }
      return result;
    },
    [onZipUpload, clearState]
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
    if (!uploadedCollection.getDatasetKeys().includes(props.targetDataset)) {
      return (
        <p>
          The .zip file is missing the dataset <b>{props.targetDataset}.</b> Some settings may be lost.
        </p>
      );
    }
    return null;
  }, [uploadedCollection, props.targetDataset]);

  return (
    <StyledModal title={"Reload dataset"} open={props.open} footer={null} onCancel={props.onClose}>
      <FlexColumn $gap={10}>
        <FlexColumn style={{ wordWrap: "break-word", wordBreak: "break-all" }}>
          <p style={{ margin: "0" }}>To continue, please reload the dataset from a .zip file.</p>
          <p>
            Previous file: <b>{props.sourceZipName}</b>
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
              name={props.sourceZipName}
              multiple={false}
              accept=".zip"
              showUploadList={false}
              beforeUpload={wrappedOnZipUpload}
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
              if (uploadedCollection && uploadedFile) {
                setSourceZipName(uploadedFile.name);
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
