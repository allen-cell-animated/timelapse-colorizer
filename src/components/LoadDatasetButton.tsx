import React, { ReactElement, useCallback, useState } from "react";
import styles from "./LoadDatasetButton.module.css";
import { Button, Input, Modal } from "antd";

type LoadDatasetButtonProps = {
  /**
   * Callback for when a URL is requested to be loaded.
   * @param url The string URL, as typed into the URL input field.
   * @returns a boolean promise of whether the load operation was successful or not.
   */
  onRequestLoad: (url: string) => Promise<boolean>;
};

const defaultProps: Partial<LoadDatasetButtonProps> = {};

export default function LoadDatasetButton(props: LoadDatasetButtonProps): ReactElement {
  props = { ...defaultProps, ...props };

  const [isLoadModalOpen, setIsLoadModalOpen] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showError, setShowError] = useState<boolean>(false);

  const handleLoadClicked = useCallback(async (): Promise<void> => {
    if (isLoading) {
      return;
    }
    setIsLoading(true);
    const succeeded = await props.onRequestLoad(urlInput);
    if (succeeded) {
      setIsLoadModalOpen(false);
    } else {
      setShowError(true);
    }
    setIsLoading(false);
  }, [urlInput, props.onRequestLoad]);

  const handleCancel = () => {
    // should this cancel dataset loading mid-load?
    setShowError(false);
    setUrlInput("");
    setIsLoadModalOpen(false);
  };

  return (
    <>
      <Button type="primary" onClick={() => setIsLoadModalOpen(true)}>
        Load
      </Button>
      <Modal
        title={"Load a single dataset or collection"}
        open={isLoadModalOpen}
        okText={"Load"}
        onOk={handleLoadClicked}
        okButtonProps={{ loading: isLoading }}
        onCancel={handleCancel}
        cancelButtonProps={{ hidden: true }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <p>Load a dataset collection (.json) or a single dataset by providing a URL specifying its location below.</p>
          <Input placeholder="Enter a URL..." value={urlInput} onChange={(event) => setUrlInput(event.target.value)} />
          {showError ? (
            <p style={{ color: "var(--color-error)" }}>
              The dataset(s) could not be loaded with the URL provided. Please check it and try again.
            </p>
          ) : (
            <></>
          )}
        </div>
      </Modal>
    </>
  );
}
