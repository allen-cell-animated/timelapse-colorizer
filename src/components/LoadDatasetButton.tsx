import React, { ReactElement, ReactNode, useCallback, useContext, useRef, useState } from "react";
import { Button, Dropdown, Input, InputRef, MenuProps, Modal } from "antd";
import { AppThemeContext } from "./AppStyle";
import { useLocalStorage } from "usehooks-ts";
import { DEFAULT_COLLECTION_FILENAME, DEFAULT_COLLECTION_PATH } from "../constants";
import { DropdownSVG } from "../assets";
import LabeledDropdown from "./LabeledDropdown";

/** Key for local storage to read/write recently opened datasets */
const RECENT_DATASETS_STORAGE_KEY = "recentDatasets";
const MAX_RECENT_DATASETS = 5;

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
  onRequestLoad: (url: string) => Promise<string>;
};

const defaultProps: Partial<LoadDatasetButtonProps> = {};

export default function LoadDatasetButton(props: LoadDatasetButtonProps): ReactElement {
  props = { ...defaultProps, ...props };

  const theme = useContext(AppThemeContext);
  const [isLoadModalOpen, setIsLoadModalOpen] = useState(false);
  const modalContextRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<InputRef>(null);
  const [urlInput, setUrlInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorText, setErrorText] = useState<string>("");
  const [recentDatasets, setRecentDatasets] = useLocalStorage<string[]>(RECENT_DATASETS_STORAGE_KEY, [
    DEFAULT_COLLECTION_PATH + "/" + DEFAULT_COLLECTION_FILENAME,
  ]);

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
        // Add to recent datasets
        // Note: Use the url input rather than the absolute resource path here. This makes it
        // easier for users to find previous inputs, rather than obfuscating it with the full path.
        const datasetIndex = recentDatasets.indexOf(urlInput);
        if (datasetIndex === -1) {
          // New dataset, add to front while maintaining max length
          setRecentDatasets([urlInput, ...recentDatasets.slice(0, MAX_RECENT_DATASETS - 1)]);
        } else {
          // Move to front
          setRecentDatasets([
            urlInput,
            ...recentDatasets.slice(0, datasetIndex),
            ...recentDatasets.slice(datasetIndex + 1),
          ]);
        }
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
    setIsLoadModalOpen(false);
  }, []);

  // RENDERING ////////////////////////////////////////////////////////
  const datasetsDropdownItems = recentDatasets.map((datasetUrl) => {
    return {
      key: datasetUrl,
      label: datasetUrl,
    };
  });

  const datasetsDropdownProps: MenuProps = {
    onClick: (info) => {
      setUrlInput(info.key);
    },
    items: datasetsDropdownItems,
  };

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
        afterOpenChange={(open) => open && inputRef.current?.focus({ cursor: "all" })}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <p>Load a collection of datasets or a single dataset by providing its URL.</p>
          <div>
            <Dropdown trigger={["click"]} menu={datasetsDropdownProps} placement="bottomLeft">
              <Input
                placeholder="https://example.com/collection.json"
                value={urlInput}
                ref={inputRef}
                onChange={(event) => setUrlInput(event.target.value)}
                allowClear
              />
            </Dropdown>
            <p>
              <i>
                <span style={{ color: theme.color.text.hint }}>Click for recent datasets</span>
              </i>
            </p>
          </div>
          {/** TODO: Mount the popups here */}
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
