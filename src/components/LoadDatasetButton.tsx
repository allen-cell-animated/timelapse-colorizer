import React, { ReactElement, useCallback, useContext, useRef, useState } from "react";
import { Button, Dropdown, Input, InputRef, MenuProps, Modal, Space } from "antd";
import { AppThemeContext } from "./AppStyle";
import { useClickAnyWhere, useLocalStorage } from "usehooks-ts";
import { DEFAULT_COLLECTION_FILENAME, DEFAULT_COLLECTION_PATH } from "../constants";
import styled from "styled-components";

/** Key for local storage to read/write recently opened datasets */
const RECENT_DATASETS_STORAGE_KEY = "recentDatasets";
const MAX_RECENT_DATASETS = 10;

const DropdownContentContainer = styled.div`
  background-color: var(--color-background);
  border-radius: var(--radius-control-small);
  box-shadow: 0 6px 16px 0 rgba(0, 0, 0, 0.08), 0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 9px 28px 8px rgba(0, 0, 0, 0.05);

  padding-top: 6px;

  & > ul.ant-dropdown-menu {
    box-shadow: transparent 0 0 !important;
    background-color: transparent;
  }
`;

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
  const modalContextRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<InputRef>(null);

  const [isLoadModalOpen, setIsLoadModalOpen] = useState(false);

  const [showRecentDropdown, setShowRecentDropdown] = useState(false);
  const [urlInput, _setUrlInput] = useState("");
  const setUrlInput = useCallback((newUrl: string) => {
    setShowRecentDropdown(false);
    _setUrlInput(newUrl);
  }, []);

  const [isLoading, setIsLoading] = useState(false);
  const [errorText, setErrorText] = useState<string>("");
  const [recentDatasets, setRecentDatasets] = useLocalStorage<string[]>(RECENT_DATASETS_STORAGE_KEY, [
    DEFAULT_COLLECTION_PATH + "/" + DEFAULT_COLLECTION_FILENAME,
  ]);

  // The dropdown should be shown whenever the user clicks on the input field, and hidden if the user starts
  // typing or clicks off of the input (including clicking options).
  useClickAnyWhere((event) => {
    if (event.target === inputRef.current?.input) {
      setShowRecentDropdown(true);
    } else {
      setShowRecentDropdown(false);
    }
  });

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
        // Add a slight delay before closing and resetting the modal for a smoother experience
        setTimeout(() => {
          setIsLoadModalOpen(false);
          setIsLoading(false);
          // Add to recent datasets
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
          setErrorText("");
          setUrlInput("");
        }, 500);
        return;
      },
      (reason) => {
        // failed
        if (reason && reason.toString().includes("AbortError")) {
          setErrorText("Timeout: The dataset(s) took too long to load. Please try again.");
          return;
        }
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
        onCancel={handleCancel}
        getContainer={modalContextRef.current || undefined}
        afterOpenChange={(open) => open && inputRef.current?.focus({ cursor: "all" })}
        footer={<Button onClick={handleCancel}>Cancel</Button>}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <p style={{ marginBottom: "10px" }}>
            Load a collection of datasets or a single dataset by providing its URL.
          </p>
          <div>
            <div style={{ display: "flex", flexDirection: "row", gap: "6px" }}>
              <Space.Compact style={{ width: "100%" }}>
                <Dropdown
                  trigger={["click"]}
                  menu={datasetsDropdownProps}
                  placement="bottomLeft"
                  open={showRecentDropdown}
                  getPopupContainer={modalContextRef.current ? () => modalContextRef.current! : undefined}
                  dropdownRender={(menu) => (
                    <DropdownContentContainer>
                      <span style={{ paddingLeft: "16px", color: theme.color.text.hint }}>Recent datasets:</span>
                      {menu}
                    </DropdownContentContainer>
                  )}
                >
                  <Input
                    placeholder="https://example.com/collection.json"
                    value={urlInput}
                    ref={inputRef}
                    onChange={(event) => setUrlInput(event.target.value)}
                    allowClear
                    disabled={isLoading}
                  />
                </Dropdown>
                <Button type="primary" onClick={handleLoadClicked} loading={isLoading}>
                  Load
                </Button>
              </Space.Compact>
            </div>
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
