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
  const [errorText, setErrorText] = useState<string>("");

  const handleLoadClicked = useCallback(async (): Promise<void> => {
    if (urlInput === "") {
      setErrorText("Please enter a URL!");
      return;
    }
    if (isLoading) {
      return;
    }
    setIsLoading(true);
    const succeeded = await props.onRequestLoad(urlInput);
    if (succeeded) {
      setIsLoadModalOpen(false);
    } else {
      setErrorText("The dataset(s) could not be loaded with the URL provided. Please check it and try again.");
    }
    setIsLoading(false);
  }, [urlInput, props.onRequestLoad]);

  const handleCancel = () => {
    // should this cancel dataset loading mid-load?
    setErrorText("");
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
          <p>Load a collection of datasets or a single dataset by providing its URL.</p>
          <Input
            placeholder="https://example.com/collection.json"
            value={urlInput}
            onChange={(event) => setUrlInput(event.target.value)}
          />
          {errorText ? <p className={styles.errorText}>{errorText}</p> : <></>}
        </div>
      </Modal>
    </>
  );
}
