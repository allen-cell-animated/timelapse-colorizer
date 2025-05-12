import { UploadOutlined, WarningOutlined } from "@ant-design/icons";
import { Modal, Upload, UploadFile } from "antd";
import React, { ReactElement, useContext, useState } from "react";

import { AnnotationState } from "../../../colorizer/utils/react_utils";
import { useViewerStateStore } from "../../../state";

import { AnnotationData } from "../../../colorizer/AnnotationData";
import { AppThemeContext } from "../../AppStyle";
import TextButton from "../../Buttons/TextButton";

type AnnotationImportButtonProps = {
  annotationState: AnnotationState;
};

export default function AnnotationImportButton(props: AnnotationImportButtonProps): ReactElement {
  const dataset = useViewerStateStore((state) => state.dataset);
  const { annotationState } = props;
  const theme = useContext(AppThemeContext);

  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [convertedAnnotationData, setConvertedAnnotationData] = useState<AnnotationData | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [errorText, setErrorText] = useState("");

  const modalContainerRef = React.useRef<HTMLDivElement>(null);

  const handleFileUpload = async (file: File): Promise<void> => {
    setUploadedFile(file);
    const isCsv = file.type === "text/csv" || file.name.endsWith(".csv");
    if (!isCsv || !dataset) {
      setErrorText("Only CSV files are supported.");
      return;
    }
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      // TODO: handle errors here
      try {
        // TODO: Do this in a worker to avoid blocking the UI thread?
        const annotationData = await AnnotationData.fromCsv(dataset, text);
        setConvertedAnnotationData(annotationData);
      } catch (error) {
        setErrorText('Could not parse CSV file. Parsing failed with the following error: "' + error + '"');
      }
    };
    reader.readAsText(file);
  };

  const handleCancel = (): void => {
    setShowModal(false);
    setConvertedAnnotationData(null);
    setUploadedFile(null);
  };

  const handleImport = async (): Promise<void> => {
    if (convertedAnnotationData) {
      // TODO: give more advanced merging options here. There are three possible
      // options:
      // 1. Overwrite existing annotations (default, current behavior)
      // 2. Keep both (no merging, labels are kept separate even if they have
      //    matching names)
      // 3. Merge annotations (merge matching labels with the same types. Users
      //    should be given an option for how to handle when conflicts occur for
      //    values (e.g. the imported CSV has a different value assigned to the
      //    same ID))
      annotationState.replaceAnnotationData(convertedAnnotationData);
      setShowModal(false);
      setConvertedAnnotationData(null);
      setUploadedFile(null);
      setErrorText("");
      annotationState.setVisibility(true);
    }
  };

  const hasAnnotationData = annotationState.data.getLabels().length > 0;

  const fileList: UploadFile[] = [];
  if (uploadedFile) {
    fileList.push({
      uid: "-1",
      name: uploadedFile.name,
      status: convertedAnnotationData !== null ? "done" : "error",
      // url: URL.createObjectURL(uploadedFile),
    });
  }

  const handleFileChange = (info: { fileList: UploadFile[] }): void => {
    if (info.fileList.length === 0) {
      setUploadedFile(null);
      setConvertedAnnotationData(null);
      setErrorText("");
    }
  };

  return (
    <div ref={modalContainerRef}>
      <Modal
        getContainer={() => modalContainerRef.current!}
        title="Import CSV"
        open={showModal}
        okText="Import"
        okButtonProps={{ disabled: !convertedAnnotationData }}
        onOk={handleImport}
        onCancel={handleCancel}
        destroyOnClose={true}
      >
        <Upload.Dragger
          name="file"
          multiple={false}
          accept=".csv"
          fileList={fileList}
          onChange={handleFileChange}
          showUploadList={true}
          beforeUpload={handleFileUpload}
        >
          <span style={{ color: theme.color.text.hint, fontSize: theme.font.size.header }}>
            <UploadOutlined />
          </span>
          <p style={{ color: theme.color.text.hint }}>Click or drag a .csv file to this area to upload</p>
        </Upload.Dragger>
        {errorText && <p style={{ color: theme.color.text.error }}>{errorText}</p>}
        {convertedAnnotationData && hasAnnotationData && (
          <p style={{ color: theme.color.text.warning }}>
            <WarningOutlined /> Existing annotations will be overwritten during import.
          </p>
        )}
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
