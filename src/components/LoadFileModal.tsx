import { UploadOutlined } from "@ant-design/icons";
import React, { ReactElement, useCallback, useState } from "react";

import { ZipFolderOutlinedSVG } from "../assets";
import { zipToFileMap } from "../colorizer/utils/data_load_utils";
import { useViewerStateStore } from "../state";
import { FlexColumn, FlexColumnAlignCenter, FlexRowAlignCenter } from "../styles/utils";

import Collection from "../colorizer/Collection";
import { ButtonStyleLink } from "./Buttons/ButtonStyleLink";
import { StyledUpload } from "./Inputs/StyledUpload";
import LoadingSpinner from "./LoadingSpinner";
import MessageCard from "./MessageCard";
import StyledModal from "./Modals/StyledModal";

type LoadFileModalProps = {
  sourceFilename: string;
  onLoad: (collection: Collection) => void;
  open: boolean;
};

/**
 * Prompts a user to load a specific ZIP file.
 * @param props
 * @returns
 */
export default function LoadFileModal(props: LoadFileModalProps): ReactElement {
  const setSourceFilename = useViewerStateStore((state) => state.setSourceFilename);

  // TODO: Show a preview of the loaded collection, like in AnnotationImportButton
  // const [loadedCollection, setLoadedCollection] = useState<Collection | null>(null);
  const [errorText, setErrorText] = useState<string | undefined>(undefined);
  const [isLoadingZip, setIsLoadingZip] = useState(false);

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
      setIsLoadingZip(true);
      const fileMap = await zipToFileMap(zipFile);
      if (Object.keys(fileMap).length === 0) {
        setErrorText("No files found in ZIP file.");
        return false;
      }
      const didLoadCollection = await handleLoadFromZipFile(zipFile.name, fileMap)
        .then((result) => {
          setSourceFilename(zipFile.name);
          props.onLoad(result);
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

  return (
    <StyledModal title={"Reload dataset"} open={props.open} footer={null} closeIcon={null}>
      <FlexColumn $gap={10}>
        <FlexColumn>
          <p style={{ margin: "0" }}>To continue, please reload the dataset from a ZIP file.</p>
        </FlexColumn>
        <LoadingSpinner loading={isLoadingZip} iconSize={48}>
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
              <br />
              <p>Click or drag a .zip file here to upload</p>
            </FlexColumnAlignCenter>
          </StyledUpload>
        </LoadingSpinner>
        {errorText && <MessageCard type="error">{errorText}</MessageCard>}
        <ButtonStyleLink to="/" type="outlined">
          Return to homepage
        </ButtonStyleLink>
      </FlexColumn>
    </StyledModal>
  );
}
