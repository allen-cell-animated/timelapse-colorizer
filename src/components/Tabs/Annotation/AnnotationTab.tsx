import { CloseOutlined } from "@ant-design/icons";
import { Color as AntdColor } from "@rc-component/color-picker";
import { ColorPicker, Table, TableProps } from "antd";
import { ItemType } from "antd/es/menu/hooks/useItems";
import React, { ReactElement, useContext, useMemo } from "react";
import styled from "styled-components";
import { Color, ColorRepresentation } from "three";

import { TagIconSVG } from "../../../assets";
import { Dataset } from "../../../colorizer";
import { AnnotationState } from "../../../colorizer/utils/react_utils";
import { FlexColumnAlignCenter, FlexRow, VisuallyHidden } from "../../../styles/utils";

import { LabelData } from "../../../colorizer/AnnotationData";
import { AppThemeContext } from "../../AppStyle";
import SelectionDropdown from "../../Dropdowns/SelectionDropdown";
import IconButton from "../../IconButton";
import AnnotationModeButton from "./AnnotationModeButton";
import LabelEditControls from "./LabelEditControls";

type AnnotationTabProps = {
  annotationState: AnnotationState;
  setTrackAndFrame: (track: number, frame: number) => void;
  dataset: Dataset | null;
};

type TableDataType = {
  key: string;
  id: number;
  track: number;
  time: number;
};

const StyledAntTable = styled(Table)`
  .ant-table-row {
    cursor: pointer;
  }

  &&&& .ant-table-cell {
    padding: 4px 8px;
  }
`;

export default function AnnotationTab(props: AnnotationTabProps): ReactElement {
  const theme = useContext(AppThemeContext);
  const {
    isAnnotationModeEnabled,
    setIsAnnotationModeEnabled,
    currentLabelIdx,
    setCurrentLabelIdx,
    data: annotationData,
    createNewLabel,
    deleteLabel,
    setLabelName,
    setLabelColor,
    setLabelOnId,
  } = props.annotationState;

  const labels = annotationData.getLabels();
  const selectedLabel: LabelData | undefined = labels[currentLabelIdx ?? -1];

  const onSelectLabelIdx = (idx: string): void => {
    props.annotationState.setCurrentLabelIdx(parseInt(idx, 10));
  };

  const onColorPickerChange = (_value: any, hex: string): void => {
    if (currentLabelIdx !== null) {
      setLabelColor(currentLabelIdx, new Color(hex as ColorRepresentation));
    }
  };

  const onCreateNewLabel = (): void => {
    const index = createNewLabel();
    setCurrentLabelIdx(index);
  };

  const onDeleteLabel = (): void => {
    if (currentLabelIdx !== null) {
      deleteLabel(currentLabelIdx);
    }
  };

  const onClickObjectRow = (_event: React.MouseEvent<any, MouseEvent>, record: TableDataType): void => {
    props.setTrackAndFrame(record.track, record.time);
  };

  const tableColumns: TableProps<TableDataType>["columns"] = [
    {
      title: "Object ID",
      dataIndex: "id",
      key: "id",
      sorter: (a, b) => a.id - b.id,
    },
    {
      title: "Track ID",
      dataIndex: "track",
      key: "track",
      sorter: (a, b) => a.track - b.track,
    },
    {
      title: "Time",
      dataIndex: "time",
      key: "time",
      sorter: (a, b) => a.time - b.time,
    },
    // Column that contains a remove button for the ID.
    {
      title: "",
      key: "action",
      render: (_, record) => (
        <IconButton
          type="text"
          onClick={(event) => {
            // Rows have their own behavior on click (jumping to a timestamp),
            // so we need to stop event propagation so that the row click event
            // doesn't fire.
            event.stopPropagation();
            setLabelOnId(currentLabelIdx!, record.id, false);
          }}
        >
          <CloseOutlined />
          <VisuallyHidden>
            Remove ID {record.id} (track {record.track})
          </VisuallyHidden>
        </IconButton>
      ),
    },
  ];

  const tableData: TableDataType[] = useMemo(() => {
    const dataset = props.dataset;
    if (currentLabelIdx !== null && dataset) {
      const ids = annotationData.getLabeledIds(currentLabelIdx);
      return ids.map((id) => {
        const track = dataset.getTrackId(id);
        const time = dataset.getTime(id);
        return { key: id.toString(), id, track, time };
      });
    }
    return [];
  }, [annotationData, currentLabelIdx, props.dataset]);

  // Options for the selection dropdown
  const selectLabelOptions: ItemType[] = labels.map((label, index) => {
    return {
      key: index.toString(),
      label: label.ids.size ? `${label.name} (${label.ids.size})` : label.name,
    };
  });

  return (
    <FlexColumnAlignCenter $gap={10}>
      <AnnotationModeButton
        active={isAnnotationModeEnabled}
        onClick={() => setIsAnnotationModeEnabled(!isAnnotationModeEnabled)}
      />

      {/* Label selection and edit/create/delete buttons */}
      <FlexRow $gap={10} style={{ width: "100%" }}>
        <SelectionDropdown
          selected={(currentLabelIdx ?? -1).toString()}
          items={selectLabelOptions}
          onChange={onSelectLabelIdx}
          disabled={currentLabelIdx === null}
          showTooltip={false}
        ></SelectionDropdown>
        <div>
          {/* TODO: Remove color picker once color dots can be added to the dropdowns. */}
          <ColorPicker
            size="small"
            value={new AntdColor(selectedLabel?.color.getHexString() || "#ffffff")}
            onChange={onColorPickerChange}
            disabledAlpha={true}
            disabled={!isAnnotationModeEnabled}
          />
        </div>

        {/*
         * Hide edit-related buttons until edit mode is enabled.
         * Note that currentLabelIdx will never be null when edit mode is enabled.
         */}
        {isAnnotationModeEnabled && currentLabelIdx !== null && (
          <LabelEditControls
            onCreateNewLabel={onCreateNewLabel}
            onDeleteLabel={onDeleteLabel}
            setLabelColor={(color: Color) => setLabelColor(currentLabelIdx, color)}
            setLabelName={(name: string) => setLabelName(currentLabelIdx, name)}
            selectedLabel={selectedLabel}
            selectedLabelIdx={currentLabelIdx}
          />
        )}
      </FlexRow>

      {/* Table */}
      <div style={{ width: "100%", marginTop: "10px" }}>
        <StyledAntTable
          dataSource={tableData}
          columns={tableColumns}
          size="small"
          pagination={false}
          // TODO: Rows aren't actually buttons, which means that they are not
          // keyboard accessible. Either find a way to make them tab indexable
          // or add a button that is equivalent to click?
          onRow={(record) => {
            return {
              onClick: (event) => {
                onClickObjectRow(event, record);
              },
            };
          }}
          locale={{
            emptyText: (
              <FlexColumnAlignCenter style={{ margin: "16px 0 10px 0" }}>
                <TagIconSVG style={{ width: "24px", height: "24px", marginBottom: 0 }} />
                <p>No annotated IDs</p>
              </FlexColumnAlignCenter>
            ),
          }}
        ></StyledAntTable>
      </div>
      {tableData.length > 0 && <p style={{ color: theme.color.text.hint }}>Click a row to jump to that object.</p>}
    </FlexColumnAlignCenter>
  );
}
