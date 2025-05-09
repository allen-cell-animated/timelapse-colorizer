import { UploadOutlined } from "@ant-design/icons";
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

  const modalContainerRef = React.useRef<HTMLDivElement>(null);

  const handleFileUpload = async (file: File): Promise<void> => {
    const isCsv = file.type === "text/csv" || file.name.endsWith(".csv");
    if (!isCsv || !dataset) {
      console.log("File is not a CSV or dataset is null");
      return;
    }
    setUploadedFile(file);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      // TODO: handle errors here
      const annotationData = await AnnotationData.fromCsv(dataset, text);
      setConvertedAnnotationData(annotationData);
      console.log("Converted annotation data:", annotationData);
    };
    reader.readAsText(file);
  };

  const handleCancel = () => {
    setShowModal(false);
    setConvertedAnnotationData(null);
    setUploadedFile(null);
  };

  const handleImport = async () => {
    if (convertedAnnotationData) {
      annotationState.replaceAnnotationData(convertedAnnotationData);
      setShowModal(false);
      setConvertedAnnotationData(null);
    }
  };

  const hasAnnotationData = annotationState.data.getLabels().length > 0;

  const fileList: UploadFile[] = [];
  if (uploadedFile) {
    fileList.push({
      uid: "-1",
      name: uploadedFile.name,
      status: "done",
      // url: URL.createObjectURL(uploadedFile),
    });
  }

  const handleFileChange = (info: { fileList: UploadFile[] }) => {
    if (info.fileList.length === 0) {
      setUploadedFile(null);
      setConvertedAnnotationData(null);
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
      >
        <Upload.Dragger
          name="file"
          multiple={false}
          accept=".csv"
          // TODO: control file list here
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
        {convertedAnnotationData && hasAnnotationData && (
          <p style={{ color: theme.color.text.error }}>
            You have existing annotations that will be overwritten during import.
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
