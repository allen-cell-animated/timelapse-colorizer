import { ReadOutlined } from "@ant-design/icons";
import { Divider, Drawer, Radio, RadioChangeEvent, Tooltip } from "antd";
import React, { ReactElement, useContext, useMemo, useState } from "react";
import styled from "styled-components";

import { Dataset } from "../colorizer";
import { FlexColumn, FlexRowAlignCenter } from "../styles/utils";

import { AppThemeContext } from "./AppStyle";
import IconButton from "./IconButton";

type GlossaryPanelProps = {
  dataset: Dataset | null;
};

const StyledDrawer = styled(Drawer)`
  .ant-drawer-body {
    padding-top: 16px;
  }

  .ant-drawer-header-title {
    // Move the close button to the right corner of the header
    display: flex;
    flex-direction: row-reverse;
  }

  p {
    margin: 0;
  }
`;

export default function GlossaryPanel(props: GlossaryPanelProps): ReactElement {
  const [showPanel, setShowPanel] = useState(false);
  const [alphabetizeFeatures, setAlphabetizeFeatures] = useState(false);

  const theme = useContext(AppThemeContext);

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
              <Tooltip title={hasDescription ? null : "No description provided"} placement="right">
                <span style={{ fontWeight: "bold" }}>{dataset.getFeatureNameWithUnits(key)}</span>
              </Tooltip>
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
      <Tooltip placement="top" title="Open feature glossary" trigger={["hover", "focus"]}>
        <IconButton
          type="link"
          onClick={() => {
            setShowPanel(true);
          }}
          disabled={!props.dataset}
        >
          <ReadOutlined style={{ marginTop: "1px" }} /* Visually align with other elements*/ />
        </IconButton>
      </Tooltip>
      <StyledDrawer
        zIndex={2000}
        width={"calc(min(75vw, 1000px))"}
        onClose={() => {
          setShowPanel(false);
        }}
        title={<span style={{ fontSize: "20px" }}>Feature glossary</span>}
        open={showPanel}
        size="large"
        style={{ color: theme.color.text.primary }}
      >
        <FlexColumn $gap={16}>
          <FlexRowAlignCenter $gap={8}>
            <h3 style={{ margin: 0, fontWeight: "normal" }} id="glossary-sortby-label">
              Sort by
            </h3>
            <Radio.Group
              buttonStyle="solid"
              // TODO: Why does Ant not support aria-label on Radio.Group?
              // "aria-label"="glossary-sortby-label"
              value={alphabetizeFeatures}
              onChange={(e: RadioChangeEvent) => setAlphabetizeFeatures(e.target.value)}
            >
              <Radio.Button value={false}>Feature order</Radio.Button>
              <Radio.Button value={true}>Alphabetical</Radio.Button>
            </Radio.Group>
          </FlexRowAlignCenter>
          <Divider />
          {drawerContent}
        </FlexColumn>
      </StyledDrawer>
    </>
  );
}
