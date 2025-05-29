import { UploadOutlined } from "@ant-design/icons";
import { Modal, Upload, UploadFile } from "antd";
import React, { ReactElement, useContext, useState } from "react";

import { AnnotationState } from "../../../colorizer/utils/react_utils";
import { useViewerStateStore } from "../../../state";
import { FlexColumn } from "../../../styles/utils";

import { AnnotationData, AnnotationParseResult } from "../../../colorizer/AnnotationData";
import { AppThemeContext } from "../../AppStyle";
import TextButton from "../../Buttons/TextButton";
import MessageCard from "../../MessageCard";
import AnnotationFileInfo from "./AnnotationFileInfo";

type AnnotationImportButtonProps = {
  annotationState: AnnotationState;
};

export default function AnnotationImportButton(props: AnnotationImportButtonProps): ReactElement {
  const dataset = useViewerStateStore((state) => state.dataset);
  const { annotationState } = props;
  const theme = useContext(AppThemeContext);

  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<AnnotationParseResult | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [errorText, setErrorText] = useState("");

  const modalContainerRef = React.useRef<HTMLDivElement>(null);

  const handleFileUpload = (file: File): void => {
    setUploadedFile(file);
    setParseResult(null);
    setErrorText("");
    const isCsv = file.type === "text/csv" || file.name.endsWith(".csv");
    if (!isCsv || !dataset) {
      setErrorText("Only CSV files are supported.");
      return;
    }
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      try {
        // TODO: Do this in a worker to avoid blocking the UI thread?
        const result = AnnotationData.fromCsv(dataset, text);
        setParseResult(result);
      } catch (error) {
        setErrorText('Could not parse CSV file. Parsing failed with the following error: "' + error + '"');
        console.error("Error parsing CSV file:", error);
      }
    };
    reader.readAsText(file);
  };

  const handleCancel = (): void => {
    setShowModal(false);
    setParseResult(null);
    setUploadedFile(null);
    setErrorText("");
  };

  const handleImport = async (): Promise<void> => {
    if (parseResult) {
      // TODO: give more advanced merging options here. There are three possible
      // options:
      // 1. Overwrite existing annotations (default, current behavior)
      // 2. Keep both (no merging, labels are kept separate even if they have
      //    matching names)
      // 3. Merge annotations (merge matching labels with the same types. Users
      //    should be given an option for how to handle when conflicts occur for
      //    values (e.g. the imported CSV has a different value assigned to the
      //    same ID))
      annotationState.replaceAnnotationData(parseResult.annotationData);
      setShowModal(false);
      setParseResult(null);
      setUploadedFile(null);
      setErrorText("");
      annotationState.setVisibility(true);
    }
  };

  const hasExistingAnnotationData = annotationState.data.getLabels().length > 0;

  const handleFileChange = (info: { fileList: UploadFile[] }): void => {
    if (info.fileList.length === 0) {
      // File was removed. Clear the state.
      setUploadedFile(null);
      setParseResult(null);
      setErrorText("");
    }
  };

  //// Rendering ////

  return (
    <div ref={modalContainerRef}>
      <Modal
        getContainer={() => modalContainerRef.current!}
        title="Import CSV"
        open={showModal}
        okText="Import"
        okButtonProps={{ disabled: !parseResult }}
        onOk={handleImport}
        onCancel={handleCancel}
        destroyOnClose={true}
      >
        <FlexColumn $gap={6}>
          {uploadedFile ? (
            <AnnotationFileInfo
              errorText={errorText}
              file={uploadedFile}
              parseResult={parseResult}
              clearFile={() => {
                setUploadedFile(null);
                setParseResult(null);
                setErrorText("");
              }}
            ></AnnotationFileInfo>
          ) : (
            <Upload.Dragger
              name="file"
              multiple={false}
              accept=".csv"
              onChange={handleFileChange}
              showUploadList={true}
              beforeUpload={handleFileUpload}
            >
              <>
                <span style={{ color: theme.color.text.hint, fontSize: theme.font.size.header }}>
                  <UploadOutlined />
                </span>
                <p style={{ color: theme.color.text.hint }}>Click or drag a .csv file to this area to upload</p>
              </>
            </Upload.Dragger>
          )}
          {parseResult && hasExistingAnnotationData && (
            <MessageCard type="warning">Existing annotations will be overwritten during import.</MessageCard>
          )}
        </FlexColumn>
      </Modal>
      <TextButton
        onClick={() => {
          setShowModal(!showModal);
        }}
        disabled={dataset === null}
      >
        Import CSV
      </TextButton>
    </div>
  );
}
