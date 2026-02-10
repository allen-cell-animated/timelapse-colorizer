import { FolderOpenOutlined, UploadOutlined } from "@ant-design/icons";
import { Button, Dropdown, Input, type InputRef, type MenuProps, Space, Upload } from "antd";
import type { MenuItemType } from "antd/es/menu/interface";
import React, { type ReactElement, type ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { useClickAnyWhere } from "usehooks-ts";

import type { Dataset } from "src/colorizer";
import Collection from "src/colorizer/Collection";
import type { ReportWarningCallback } from "src/colorizer/types";
import { zipToFileMap } from "src/colorizer/utils/data_load_utils";
import { convertAllenPathToHttps, isAllenPath } from "src/colorizer/utils/url_utils";
import TextButton from "src/components/Buttons/TextButton";
import StyledInlineProgress from "src/components/Feedback/StyledInlineProgress";
import MessageCard from "src/components/MessageCard";
import StyledModal from "src/components/Modals/StyledModal";
import { AnnotationState, useAnnotationDatasetWarning, useRecentCollections } from "src/hooks";
import { useJsxText } from "src/hooks/useJsxText";
import { useViewerStateStore } from "src/state";
import { AppThemeContext } from "src/styles/AppStyle";
import { FlexRowAlignCenter } from "src/styles/utils";

const DEFAULT_URL_FAILURE_MESSAGE =
  "The dataset(s) could not be loaded with the URL provided. Please check it and try again.";

type LoadDatasetButtonProps = {
  /**
   * Callback when a dataset was successfully loaded.
   * @param collection
   * @param dataset
   * @returns
   */
  onLoad: (collection: Collection, datasetKey: string, dataset: Dataset) => void;
  /** The URL of the currently loaded resource, used to indicate it on the recent datasets dropdown. */
  currentResourceUrl: string;
  reportWarning?: ReportWarningCallback;
  annotationState?: AnnotationState;
};

type LoadedCollectionResult = [string, Collection, Dataset];

const defaultProps: Partial<LoadDatasetButtonProps> = {};

/** Mocks the styling of a Dropdown menu, because Ant Dropdown does not let us directly
 * insert elements into the menu. We have to create a wrapper element to make it look
 * like a single dropdown.
 */
const DropdownContentContainer = styled.div`
  position: absolute;
  width: max-content;
  max-width: 80vw;
  background-color: var(--color-background);
  border-radius: var(--radius-control-small);
  box-shadow: 0 6px 16px 0 rgba(0, 0, 0, 0.08), 0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 9px 28px 8px rgba(0, 0, 0, 0.05);

  padding-top: 6px;

  & > ul.ant-dropdown-menu {
    // Disable the real dropdown's styling
    box-shadow: transparent 0 0 !important;
    background-color: transparent;
  }

  & .ant-dropdown-menu-item {
    width: 100%;
    overflow: hidden;
  }

  & .ant-dropdown-menu-item:not(:last-child) {
    margin-bottom: 4px;
  }
`;

export default function LoadDatasetButton(props: LoadDatasetButtonProps): ReactElement {
  props = { ...defaultProps, ...props };

  const theme = useContext(AppThemeContext);
  const dropdownContextRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<InputRef>(null);
  const setSourceZipName = useViewerStateStore((state) => state.setSourceZipName);
  const clearSourceZipName = useViewerStateStore((state) => state.clearSourceZipName);

  // STATE ////////////////////////////////////////////////////////////

  // Directly control the visibility of the recent datasets dropdown because
  // Ant's default behavior has some bugs (the menu will appear and disappear
  // suddenly) if trying to temporarily disable visibility.
  const [showRecentDropdown, setShowRecentDropdown] = useState(false);
  const [urlInput, _setUrlInput] = useState("");
  // Wrap `setUrlInput` so we clear the dropdown when user starts typing
  const setUrlInput = useCallback((newUrl: string) => {
    setShowRecentDropdown(false);
    _setUrlInput(newUrl);
  }, []);

  const [recentCollections, registerCollection] = useRecentCollections();

  const [isLoadingUrl, setIsLoadingUrl] = useState(false);
  const [isLoadingZip, setIsLoadingZip] = useState(false);
  const [zipLoadProgress, setZipLoadProgress] = useState(0);
  const [errorText, setErrorText] = useJsxText();

  const [isLoadModalOpen, setIsLoadModalOpen] = useState(false);

  // BEHAVIOR ////////////////////////////////////////////////////////////

  useEffect(() => {
    if (isLoadModalOpen) {
      // Clear modal when opening
      // TODO: This does not actually stop the underlying load operation. Could cause the interface to act
      // unexpectedly, but maybe not a huge problem because there's a ~4s timeout on the load operation anyways.
      setIsLoadingUrl(false);
      setIsLoadingZip(false);
      setErrorText("");
    }
  }, [isLoadModalOpen]);

  // The dropdown should be shown whenever the user clicks on the input field, and hidden if the user starts
  // typing or clicks off of the input (including selecting options in the dropdown).
  // TODO: Switch to using AccessibleDropdown as a base component
  useClickAnyWhere((event) => {
    if (event.target === inputRef.current?.input) {
      setShowRecentDropdown(true);
    } else {
      setShowRecentDropdown(false);
    }
  });

  const onCollectionLoaded = (loadedUrl: string, collection: Collection, dataset: Dataset): void => {
    props.onLoad(collection, collection.getDefaultDatasetKey(), dataset);

    // Add a slight delay before closing and resetting the modal for a smoother experience
    setTimeout(() => {
      setIsLoadModalOpen(false);
      setIsLoadingUrl(false);
      setIsLoadingZip(false);
      // Add to recent collections
      registerCollection({
        url: loadedUrl,
        label: urlInput, // Use raw url input for the label
      });
      setErrorText("");
      setUrlInput("");
    }, 500);
    return;
  };

  const loadCollectionData = useCallback(async (newCollection: Collection): Promise<LoadedCollectionResult> => {
    const newDatasetKey = newCollection.getDefaultDatasetKey();
    const loadResult = await newCollection.tryLoadDataset(newDatasetKey);
    if (!loadResult.loaded) {
      const errorMessage = loadResult.errorMessage;

      if (errorMessage) {
        // Remove 'Error:' prefixes
        const matches = errorMessage.replace(/^(Error:)*/, "");
        // Reject the promise with the error message
        throw new Error(matches);
      } else {
        throw new Error();
      }
    }

    const resourceUrl = newCollection.sourcePath || newCollection.getDefaultDatasetKey();
    return [resourceUrl, newCollection, loadResult.dataset];
  }, []);

  const handleLoadUrl = useCallback(
    async (url: string): Promise<LoadedCollectionResult> => {
      console.log("Loading '" + url + "'.");
      const collection = await Collection.loadFromAmbiguousUrl(url, { reportWarning: props.reportWarning });
      return loadCollectionData(collection);
    },
    [loadCollectionData, props.reportWarning]
  );

  const handleLoadFromZipFile = useCallback(
    async (fileName: string, fileMap: Record<string, File>): Promise<LoadedCollectionResult> => {
      console.log("Loading from ZIP file:", fileName);
      const collection = await Collection.loadFromAmbiguousFile(fileName, fileMap, {
        reportWarning: props.reportWarning,
      });
      return loadCollectionData(collection);
    },
    [loadCollectionData, props.reportWarning]
  );

  const handleLoadZipClicked = useCallback(
    async (zipFile: File): Promise<boolean> => {
      if (isLoadingUrl || isLoadingZip) {
        return false;
      }
      setErrorText("");
      setIsLoadingZip(true);
      setZipLoadProgress(0);
      const handleProgressUpdate = (complete: number, total: number): void => {
        setZipLoadProgress(Math.floor((complete / total) * 100));
      };
      let fileMap: Record<string, File> = {};
      try {
        fileMap = await zipToFileMap(zipFile, handleProgressUpdate);
      } catch (error) {
        setErrorText(error instanceof Error ? error.message : String(error));
        setIsLoadingZip(false);
        return false;
      }
      if (Object.keys(fileMap).length === 0) {
        setIsLoadingZip(false);
        return false;
      }
      const didLoadCollection = await handleLoadFromZipFile(zipFile.name, fileMap)
        .then((result) => {
          setSourceZipName(zipFile.name);
          onCollectionLoaded(...result);
          return true;
        })
        .catch((reason) => {
          // failed
          setErrorText(reason.toString() || DEFAULT_URL_FAILURE_MESSAGE);
          return false;
        });
      setIsLoadingZip(false);
      return didLoadCollection;
    },
    [
      isLoadingUrl,
      isLoadingZip,
      setErrorText,
      setIsLoadingZip,
      setZipLoadProgress,
      handleLoadFromZipFile,
      setSourceZipName,
      onCollectionLoaded,
    ]
  );

  const handleLoadClicked = useCallback(async (): Promise<void> => {
    if (urlInput === "") {
      setErrorText("Please enter a URL!");
      return;
    }
    let formattedUrlInput = urlInput.trim();
    let hasConvertedAllenPath = false;
    // Check if the URL is an allen resource. If so, attempt to convert it.
    if (isAllenPath(formattedUrlInput)) {
      const convertedUrl = convertAllenPathToHttps(formattedUrlInput);
      if (!convertedUrl) {
        setErrorText(
          "The provided filestore path cannot be loaded directly. Please check that the path is correct; if this a path you expect to work, file an issue on GitHub. Alternatively, move your dataset so it is served over HTTPS."
        );
        return;
      }
      hasConvertedAllenPath = true;
      formattedUrlInput = convertedUrl;
    }

    if (window.location.protocol === "https:" && formattedUrlInput.startsWith("http:")) {
      setErrorText(
        "Cannot load a HTTP resource from an HTTPS site. Please move your dataset so it is served over HTTPS, or install and run this project locally."
      );
      return;
    }
    if (isLoadingUrl || isLoadingZip) {
      return;
    }
    setIsLoadingUrl(true);

    handleLoadUrl(formattedUrlInput).then(
      (result) => {
        onCollectionLoaded(...result);
        clearSourceZipName();
      },
      (reason) => {
        // failed
        if (reason && reason.toString().includes("AbortError")) {
          setErrorText(
            "Timeout: The server took too long to respond. Please check if the file server is online and try again."
          );
        } else if (hasConvertedAllenPath) {
          setErrorText(
            (reason.toString() || DEFAULT_URL_FAILURE_MESSAGE) +
              "\nIf the problem is not network access, this may be an unrecognized file path. If you expect this path to work, please report an issue on GitHub from the Help menu or contact a developer."
          );
        } else {
          setErrorText(reason.toString() || DEFAULT_URL_FAILURE_MESSAGE);
        }
        setIsLoadingUrl(false);
      }
    );
  }, [urlInput, props.onLoad, clearSourceZipName]);

  const { popupEl: loadButtonPopupEl, wrappedCallback: wrappedHandleLoadClicked } = useAnnotationDatasetWarning(
    handleLoadClicked,
    props.annotationState
  );
  const { popupEl: loadZipPopupEl, wrappedCallback: wrappedHandleLoadZipClicked } = useAnnotationDatasetWarning(
    handleLoadZipClicked,
    props.annotationState
  );

  const handleCancel = useCallback(() => {
    // should this cancel datasets/collection loading mid-load?
    setIsLoadingUrl(false);
    setIsLoadingZip(false);
    setErrorText("");
    setIsLoadModalOpen(false);
    setShowRecentDropdown(false);
  }, []);

  // RENDERING ////////////////////////////////////////////////////////

  const collectionsDropdownItems: MenuItemType[] = recentCollections
    .map(({ url, label }) => {
      const isCurrentUrl = props.currentResourceUrl === url;
      return {
        key: url,
        label: label,
        style: isCurrentUrl ? { color: "var(--color-text-hint)" } : undefined,
        icon: isCurrentUrl ? <FolderOpenOutlined /> : undefined,
      };
    })
    .filter((item) => item.label);

  // Get the URLs (keys) of any recent collections that match the currently selected urlInput.
  const matchingKeys = recentCollections.filter(({ label }) => label === urlInput).map(({ url }) => url);
  const collectionsDropdownProps: MenuProps = {
    onClick: (info) => {
      // Set the URL input to the label of the selected collection
      const collection = recentCollections.find(({ url }) => url === info.key);
      if (collection) {
        setUrlInput(collection.label ?? collection.url);
      }
    },
    items: collectionsDropdownItems,
    selectable: true,
    selectedKeys: matchingKeys,
  };

  const renderDropdown = (menu: ReactNode): React.JSX.Element => (
    // Add a fake container around this so we can include a text label ("Recent datasets")
    <DropdownContentContainer>
      <span style={{ paddingLeft: "16px", color: theme.color.text.hint }}>Recent datasets:</span>
      {menu}
    </DropdownContentContainer>
  );

  const isRecentDropdownEmpty = recentCollections.length === 0;

  return (
    <div>
      <TextButton onClick={() => setIsLoadModalOpen(true)}>
        <UploadOutlined />
        <p>Load</p>
      </TextButton>
      <StyledModal
        title={"Load a single dataset or collection"}
        open={isLoadModalOpen}
        onCancel={handleCancel}
        afterOpenChange={(open) => open && inputRef.current?.focus({ cursor: "all" })}
        footer={<Button onClick={handleCancel}>Cancel</Button>}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <p style={{ marginBottom: "10px" }}>Load a collection of datasets or a single dataset by providing a URL.</p>

          <div ref={dropdownContextRef} style={{ position: "relative" }}>
            <p>
              <i>
                <span style={{ color: theme.color.text.hint }}> Click to show recent datasets</span>
              </i>
            </p>
            <div style={{ display: "flex", flexDirection: "row", gap: "6px" }}>
              <Space.Compact style={{ width: "100%" }}>
                <Dropdown
                  trigger={["click"]}
                  menu={collectionsDropdownProps}
                  placement="bottomLeft"
                  open={showRecentDropdown && !isRecentDropdownEmpty}
                  getPopupContainer={dropdownContextRef.current ? () => dropdownContextRef.current! : undefined}
                  popupRender={renderDropdown}
                >
                  <Input
                    placeholder="https://example.com/collection.json"
                    value={urlInput}
                    ref={inputRef}
                    onChange={(event) => setUrlInput(event.target.value)}
                    allowClear
                    disabled={isLoadingUrl || isLoadingZip}
                    onPressEnter={wrappedHandleLoadClicked}
                  />
                </Dropdown>
                <div>
                  <Button
                    type="primary"
                    onClick={wrappedHandleLoadClicked}
                    loading={isLoadingUrl}
                    disabled={isLoadingZip}
                  >
                    Load
                  </Button>
                  {loadButtonPopupEl}
                </div>
              </Space.Compact>
            </div>
          </div>

          <FlexRowAlignCenter>
            <div>
              <Upload
                name="file"
                multiple={false}
                accept=".zip"
                showUploadList={false}
                beforeUpload={wrappedHandleLoadZipClicked}
              >
                <FlexRowAlignCenter $gap={6}>
                  <Button disabled={isLoadingUrl || isLoadingZip} type="link" style={{ padding: 0 }}>
                    Load .zip file
                  </Button>
                  {(isLoadingZip || zipLoadProgress !== 0) && !errorText && (
                    <StyledInlineProgress percent={zipLoadProgress} sizePx={16} />
                  )}
                </FlexRowAlignCenter>
              </Upload>
              {loadZipPopupEl}
            </div>
          </FlexRowAlignCenter>
          {errorText && <MessageCard type="error">{errorText}</MessageCard>}
        </div>
      </StyledModal>
    </div>
  );
}
