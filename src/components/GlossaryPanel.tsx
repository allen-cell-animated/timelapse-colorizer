import { BookOutlined } from "@ant-design/icons";
import { Drawer, Tooltip } from "antd";
import React, { ReactElement, useState } from "react";

import { Dataset } from "../colorizer";
import { ExternalLink } from "../styles/utils";

import IconButton from "./IconButton";

type GlossaryPanelProps = {
  dataset: Dataset | null;
};

export default function GlossaryPanel(props: GlossaryPanelProps): ReactElement {
  const [showPanel, setShowPanel] = useState(false);

  return (
    <>
      <Tooltip placement="top" title="Open feature glossary">
        <IconButton
          type="link"
          onClick={() => {
            setShowPanel(true);
          }}
        >
          <BookOutlined />
        </IconButton>
      </Tooltip>
      <Drawer
        zIndex={2000}
        onClose={() => {
          setShowPanel(false);
        }}
        title={<span style={{ fontSize: "20px" }}>Feature glossary</span>}
        open={showPanel}
        size="large"
      >
        <i>Definitions are provided by the dataset authors.</i>
        {props.dataset?.featureKeys.map((featureKey) => {
          const featureData = props.dataset?.getFeatureData(featureKey);

          return (
            <p style={{ lineHeight: "1.5" }}>
              <b>{featureData?.name}</b>: {featureData?.description}
            </p>
          );
        })}
        <br />
        <i>
          For dataset authors: See our{" "}
          <ExternalLink href="https://github.com/allen-cell-animated/colorizer-data/blob/main/documentation/DATA_FORMAT.md#dataset">
            documentation on GitHub
          </ExternalLink>{" "}
          for adding custom definitions.
        </i>
      </Drawer>
    </>
  );
}
