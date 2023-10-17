import React, { ReactElement, useCallback, useContext, useRef, useState } from "react";
import { Button, Input, Modal } from "antd";
import { AppThemeContext } from "./AppStyle";

type LoadDatasetButtonProps = {
  /**
   * Callback for when a URL is requested to be loaded.
   * @param url The string URL, as typed into the URL input field.
   * @returns a Promise object repreesenting the status of the request.
   * - The promise should reject if the load fails for any reason. If it provides
   * a reason, the reason will be shown in the modal.
   * - The promise should resolve when the load has completed, which will cause the
   * modal to dismiss.
   */
  onRequestLoad: (url: string) => Promise<void>;
};

const defaultProps: Partial<LoadDatasetButtonProps> = {};

export default function LoadDatasetButton(props: LoadDatasetButtonProps): ReactElement {
  props = { ...defaultProps, ...props };

  const theme = useContext(AppThemeContext);
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
    if (window.location.protocol === "https:" && urlInput.trim().startsWith("http:")) {
      setErrorText(
        "Cannot load a HTTP resource from an HTTPS site. Please move your dataset so it is served over HTTPS, or install and run this project locally."
      );
      return;
    }
    if (isLoading) {
      return;
    }
    setIsLoading(true);
    props.onRequestLoad(urlInput).then(
      () => {
        // success
        setErrorText("");
        setUrlInput("");
        setIsLoadModalOpen(false);
        setIsLoading(false);
        return;
      },
      (reason) => {
        // failed
        setErrorText(
          reason.toString() ||
            "The dataset(s) could not be loaded with the URL provided. Please check it and try again."
        );
        setIsLoading(false);
      }
    );
  }, [urlInput, props.onRequestLoad]);

  const handleCancel = useCallback(() => {
    // should this cancel dataset loading mid-load?
    setErrorText("");
    setUrlInput("");
    setIsLoadModalOpen(false);
  }, []);

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
        getContainer={modalContextRef.current || undefined}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <p>Load a collection of datasets or a single dataset by providing its URL.</p>
          <Input
            placeholder="https://example.com/collection.json"
            value={urlInput}
            onChange={(event) => setUrlInput(event.target.value)}
          />
          {errorText && (
            <p>
              <span style={{ color: theme.color.text.error }}>{errorText}</span>
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
}
