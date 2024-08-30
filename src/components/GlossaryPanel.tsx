import { BookOutlined, CloseOutlined } from "@ant-design/icons";
import { Button, Divider, Drawer, Radio, RadioChangeEvent, Tooltip } from "antd";
import React, { ReactElement, useContext, useMemo, useState } from "react";

import { Dataset } from "../colorizer";
import { ExternalLink, FlexColumn, FlexRowAlignCenter } from "../styles/utils";

import { AppThemeContext } from "./AppStyle";
import IconButton from "./IconButton";

type GlossaryPanelProps = {
  dataset: Dataset | null;
};

export default function GlossaryPanel(props: GlossaryPanelProps): ReactElement {
  const [showPanel, setShowPanel] = useState(false);
  const [alphabetizeFeatures, setAlphabetizeFeatures] = useState(false);

  const theme = useContext(AppThemeContext);

  const definedFeatureStyle: React.CSSProperties = useMemo(
    () => ({
      fontWeight: "bold",
    }),
    []
  );
  const undefinedFeatureStyle: React.CSSProperties = useMemo(
    () => ({
      fontWeight: "bold",
      color: theme.color.text.hint,
      fontStyle: "italic",
    }),
    []
  );

  const drawerContent = useMemo(() => {
    const dataset = props.dataset;
    if (dataset === null) {
      return null;
    }
    const allFeatureData = dataset.featureKeys.map((featureKey) => dataset.getFeatureData(featureKey)!);
    if (alphabetizeFeatures) {
      allFeatureData.sort((a, b) => a.name.localeCompare(b.name));
    }

    return (
      <FlexColumn $gap={15}>
        {allFeatureData.map((featureData) => {
          const hasDescription = featureData.description && featureData.description !== "";
          const key = featureData.key;
          return (
            <p style={{ lineHeight: "1.5", margin: "0" }} key={key}>
              <span style={hasDescription ? definedFeatureStyle : undefinedFeatureStyle}>
                {dataset.getFeatureNameWithUnits(key)}
              </span>
              <br />
              {featureData.description}
            </p>
          );
        })}
      </FlexColumn>
    );
  }, [props.dataset, alphabetizeFeatures]);

  return (
    <>
      <Tooltip placement="top" title="Open feature glossary">
        <IconButton
          type="link"
          onClick={() => {
            setShowPanel(true);
          }}
          disabled={!props.dataset}
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
        closeIcon={null}
        style={{ color: theme.color.text.primary }}
        extra={
          <Button className="ant-modal-close-x" type="text" aria-label={"Close"} onClick={() => setShowPanel(false)}>
            <CloseOutlined />
          </Button>
        }
      >
        <FlexColumn $gap={20}>
          <FlexRowAlignCenter $gap={6}>
            <h3 style={{ margin: 0, fontWeight: "normal" }}>Sort by</h3>
            <Radio.Group
              buttonStyle="solid"
              value={alphabetizeFeatures}
              onChange={(e: RadioChangeEvent) => setAlphabetizeFeatures(e.target.value)}
            >
              <Radio.Button value={false}>Order</Radio.Button>
              <Radio.Button value={true}>A - Z</Radio.Button>
            </Radio.Group>
          </FlexRowAlignCenter>
          <Divider />
          {drawerContent}
          <Divider />
          <p>
            For dataset authors: see our{" "}
            <ExternalLink href="https://github.com/allen-cell-animated/colorizer-data/blob/main/documentation/DATA_FORMAT.md#dataset">
              documentation on GitHub
            </ExternalLink>{" "}
            for adding feature definitions.
          </p>
        </FlexColumn>
      </Drawer>
    </>
  );
}
