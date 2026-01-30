import { CheckCircleOutlined, ExclamationCircleFilled, InfoCircleFilled, ShareAltOutlined } from "@ant-design/icons";
import { Popconfirm } from "antd";
import type { NotificationInstance } from "antd/es/notification/interface";
import React, { type ReactElement, type ReactNode, useContext, useRef, useState } from "react";

import { ALLEN_FILE_PREFIX, PUBLIC_TFE_URL, VAST_FILES_URL } from "src/colorizer/utils/url_utils";
import { ButtonStyleLink } from "src/components/Buttons/ButtonStyleLink";
import TextButton from "src/components/Buttons/TextButton";
import { useViewerStateStore } from "src/state";
import { AppThemeContext } from "src/styles/AppStyle";
import { ExternalLink } from "src/styles/utils";
import { renderStringArrayAsJsx } from "src/utils/formatting";

type ShareUrlButtonProps = {
  notificationApi: NotificationInstance;
};

const LOCALHOST_REGEX = /^https?:\/\/localhost:\d+\//;

function isLocalUrl(url: string): boolean {
  return LOCALHOST_REGEX.test(url);
}

function isInternalUrl(url: string): boolean {
  return url.startsWith(ALLEN_FILE_PREFIX) || url.startsWith(VAST_FILES_URL);
}

export default function ShareUrlButton(props: ShareUrlButtonProps): ReactElement {
  const theme = useContext(AppThemeContext);

  const collection = useViewerStateStore((state) => state.collection);
  const dataset = useViewerStateStore((state) => state.dataset);

  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const collectionUrl = collection?.getUrl() || "";
  const dataset3dSource = dataset?.frames3d?.source || "";
  const dataset2dSource = dataset?.frameFiles?.[0] || "";
  const datasetManifestUrl = dataset?.manifestUrl || "";

  const dataSources = [collectionUrl, dataset3dSource, dataset2dSource, datasetManifestUrl];

  const isLocalTfeInstance = window.location.hostname === "localhost";
  const hasLocalUrls = dataSources.some(isLocalUrl);
  const hasInternalUrls = dataSources.some(isInternalUrl);

  const copyUrlAndShowNotification = (): void => {
    navigator.clipboard.writeText(document.URL);
    props.notificationApi["success"]({
      message: "URL copied to clipboard",
      placement: "bottomLeft",
      duration: 4,
      icon: <CheckCircleOutlined style={{ color: theme.color.text.success }} />,
      style: {
        backgroundColor: theme.color.alert.fill.success,
        border: `1px solid ${theme.color.alert.border.success}`,
      },
    });
  };

  const handleOpenChange = (open: boolean): void => {
    if (!open) {
      setIsOpen(false);
      return;
    }
    const canShareNormally = !isLocalTfeInstance && !hasLocalUrls && !hasInternalUrls;
    if (canShareNormally) {
      copyUrlAndShowNotification();
    } else {
      setIsOpen(true);
    }
  };

  let warningTitle = "Shared URL may fail to load";
  let icon = <ExclamationCircleFilled />;
  const warningContents: ReactNode[] = [];

  const faqLink = (
    <span>
      For more help, see our{" "}
      <ExternalLink href="https://github.com/allen-cell-animated/timelapse-colorizer/blob/doc/dataset-sharing/docs/FAQ.md#q-how-do-i-share-local-datasets">
        FAQ documentation.
      </ExternalLink>
    </span>
  );

  if (hasLocalUrls) {
    warningContents.push(
      "The dataset is being loaded from a local source (e.g. localhost). You may need to move the dataset to an HTTPS-accessible location for other users to load it.",
      faqLink
    );
  } else if (isLocalTfeInstance) {
    // TFE instance is local but dataset isn't, so it can be opened in public TFE.
    warningContents.push(
      "This URL may not load for other users because the viewer is running locally. You can try opening this dataset in the public build here:",
      <ButtonStyleLink
        to={document.URL.replace(LOCALHOST_REGEX, PUBLIC_TFE_URL)}
        target="_blank"
        style={{ marginTop: "4px" }}
      >
        Open in public build
      </ButtonStyleLink>
    );
  } else if (hasInternalUrls) {
    icon = <InfoCircleFilled style={{ color: theme.color.text.info }} />;
    warningTitle = "Shared URL may not load for external users";
    warningContents.push(
      "Some files in the dataset are being loaded from the internal filesystem, so external users may not be able to load it.",
      faqLink
    );
  }

  return (
    <div>
      <Popconfirm
        title={warningTitle}
        description={<div style={{ maxWidth: "300px" }}>{renderStringArrayAsJsx(warningContents)}</div>}
        onConfirm={copyUrlAndShowNotification}
        getPopupContainer={() => {
          return containerRef.current ?? document.body;
        }}
        icon={icon}
        okText="Copy URL"
        open={isOpen}
        onOpenChange={handleOpenChange}
        style={{ marginRight: "10px" }}
        placement="bottomRight"
      >
        <TextButton>
          <ShareAltOutlined />
          <p>Share</p>
        </TextButton>
        <div ref={containerRef}></div>
      </Popconfirm>
    </div>
  );
}
