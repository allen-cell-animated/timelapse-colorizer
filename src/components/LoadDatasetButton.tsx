import React, { ReactElement, useCallback, useRef, useState } from "react";
import styles from "./LoadDatasetButton.module.css";
import { Button, Input, Modal } from "antd";

export type LoadResult = {
  result: boolean;
  errorMessage?: string;
};

type LoadDatasetButtonProps = {
  /**
   * Callback for when a URL is requested to be loaded.
   * @param url The string URL, as typed into the URL input field.
   * @returns a boolean promise of whether the load operation was successful or not.
   */
  onRequestLoad: (url: string) => Promise<LoadResult>;
};

const defaultProps: Partial<LoadDatasetButtonProps> = {};

export default function LoadDatasetButton(props: LoadDatasetButtonProps): ReactElement {
  props = { ...defaultProps, ...props };

  const [isLoadModalOpen, setIsLoadModalOpen] = useState(false);
  const modalContextRef = useRef<HTMLDivElement>(null);
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
    const result = await props.onRequestLoad(urlInput);
    if (result.result) {
      // success!
      setErrorText("");
      setUrlInput("");
      setIsLoadModalOpen(false);
      setIsLoading(false);
      return;
    }

    setErrorText(
      result.errorMessage || "The dataset(s) could not be loaded with the URL provided. Please check it and try again."
    );

    setIsLoading(false);
  }, [urlInput, props.onRequestLoad]);

  const handleCancel = useCallback(() => {
    // should this cancel dataset loading mid-load?
    setErrorText("");
    setUrlInput("");
    setIsLoadModalOpen(false);
  }, []);

  // Override modal container method if the ref has been set (after first render)
  const modalGetContainer = modalContextRef
    ? () => {
        return modalContextRef.current!;
      }
    : undefined;

  return (
    <div ref={modalContextRef}>
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
        getContainer={modalGetContainer}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <p>Load a collection of datasets or a single dataset by providing its URL.</p>
          <Input
            placeholder="https://example.com/collection.json"
            value={urlInput}
            onChange={(event) => setUrlInput(event.target.value)}
          />
          {errorText ? (
            <p>
              <span className={styles.errorText}>{errorText}</span>
            </p>
          ) : (
            <></>
          )}
        </div>
      </Modal>
    </div>
  );
}
