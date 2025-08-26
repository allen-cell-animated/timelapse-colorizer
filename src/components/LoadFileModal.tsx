import { UploadOutlined } from "@ant-design/icons";
import { Button } from "antd";
import React, { ReactElement, ReactNode, useCallback, useMemo, useState } from "react";

import { ZipFolderOutlinedSVG } from "../assets";
import { zipToFileMap } from "../colorizer/utils/data_load_utils";
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
  open: boolean;
};

/**
 * Prompts a user to reload a collection from a ZIP file.
 */
export default function LoadFileModal(props: LoadFileModalProps): ReactElement {
  const setSourceFilename = useViewerStateStore((state) => state.setSourceFilename);

  // TODO: Show a preview of the loaded collection, like in AnnotationImportButton
  // const [loadedCollection, setLoadedCollection] = useState<Collection | null>(null);
  const [isLoadingZip, setIsLoadingZip] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedCollection, setUploadedCollection] = useState<Collection | null>(null);
  const [errorText, setErrorText] = useState<string | undefined>(undefined);

  const handleLoadFromZipFile = async (fileName: string, fileMap: Record<string, File>): Promise<Collection> => {
    console.log("Loading from ZIP file:", fileName);
    const collection = await Collection.loadFromAmbiguousFile(fileName, fileMap, {});
    return collection;
  };

  const onZipUpload = useCallback(
    async (zipFile: File): Promise<boolean> => {
      if (isLoadingZip) {
        return false;
      }
      setErrorText("");
      setUploadedFile(zipFile);
      setIsLoadingZip(true);
      const fileMap = await zipToFileMap(zipFile);
      if (Object.keys(fileMap).length === 0) {
        setErrorText("No files found in ZIP file.");
        return false;
      }
      const didLoadCollection = await handleLoadFromZipFile(zipFile.name, fileMap)
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
    [isLoadingZip, setErrorText, setIsLoadingZip, setSourceFilename, props.onLoad]
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
        The collection does not contain the expected dataset <b>{props.targetDataset}</b>. A different ZIP file may have
        been loaded or the collection may have been modified.
      </p>
    );
  }, [uploadedCollection, props.targetDataset]);

  return (
    <StyledModal title={"Reload dataset"} open={props.open} footer={null} closeIcon={null}>
      <FlexColumn $gap={10}>
        <FlexColumn>
          <p style={{ margin: "0" }}>To continue, please reload the dataset from a ZIP file.</p>
          <p>
            This dataset was previously opened from the file <ZipFolderOutlinedSVG /> <b>{props.sourceFilename}</b>
          </p>
        </FlexColumn>
        <LoadingSpinner loading={isLoadingZip} iconSize={48}>
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
            >
              <FlexColumnAlignCenter>
                <span>
                  <UploadOutlined />
                </span>
                <FlexRowAlignCenter $gap={4}>
                  <ZipFolderOutlinedSVG />
                  <p style={{ wordWrap: "break-word", wordBreak: "break-all" }}>
                    <b>{props.sourceFilename}</b>
                  </p>
                </FlexRowAlignCenter>
                <p>Click or drag a .zip file here to upload</p>
              </FlexColumnAlignCenter>
            </StyledUpload>
          )}
        </LoadingSpinner>
        <FlexRowAlignCenter $gap={10} style={{ justifyContent: "flex-end" }}>
          <ButtonStyleLink to="/" type="outlined">
            Return to homepage
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
