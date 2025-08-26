import { Button, Upload } from "antd";
import React, { ReactElement, useState } from "react";

import { zipToFileMap } from "../colorizer/utils/data_load_utils";
import { useViewerStateStore } from "../state";
import { FlexColumn, FlexRowAlignCenter } from "../styles/utils";

import Collection from "../colorizer/Collection";
import { ButtonStyleLink } from "./Buttons/ButtonStyleLink";
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

  const [errorText, setErrorText] = useState<string | undefined>(undefined);
  const [isLoadingZip, setIsLoadingZip] = useState(false);

  const handleLoadFromZipFile = async (fileName: string, fileMap: Record<string, File>): Promise<Collection> => {
    console.log("Loading from ZIP file:", fileName);
    const collection = await Collection.loadFromAmbiguousFile(fileName, fileMap, {});
    return collection;
  };

  return (
    <StyledModal title={"Reload dataset"} open={props.open} footer={null}>
      <FlexColumn>
        <p>
          To reload a local dataset, please open the original ZIP file: <strong>{props.sourceFilename}</strong>
        </p>
        {errorText && <MessageCard type="error">{errorText}</MessageCard>}
      </FlexColumn>
      <FlexRowAlignCenter $gap={20} style={{ marginTop: 20 }}>
        <ButtonStyleLink to="/" type="outlined">
          Return to homepage
        </ButtonStyleLink>
        <Upload
          name="file"
          multiple={false}
          accept=".zip"
          showUploadList={false}
          beforeUpload={async (zipFile: File): Promise<boolean> => {
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
          }}
        >
          <Button loading={isLoadingZip} type="primary">
            Load from ZIP
          </Button>
        </Upload>
      </FlexRowAlignCenter>
    </StyledModal>
  );
}
