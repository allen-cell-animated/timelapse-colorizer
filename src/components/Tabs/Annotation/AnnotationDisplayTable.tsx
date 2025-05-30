import { CloseOutlined } from "@ant-design/icons";
import { Table, TableProps } from "antd";
import React, { memo, ReactElement, useContext, useMemo } from "react";
import styled from "styled-components";

import { TagIconSVG } from "../../../assets";
import { Dataset } from "../../../colorizer";
import { FlexColumnAlignCenter, VisuallyHidden } from "../../../styles/utils";

import { AppThemeContext } from "../../AppStyle";
import IconButton from "../../IconButton";

const SELECTED_ROW_CLASSNAME = "selected-row";

export type TableDataType = {
  key: string;
  id: number;
  segId: number;
  track: number;
  value: string;
  time: number;
};

const StyledAntTable = styled(Table)`
  .ant-table-row {
    cursor: pointer;
  }

  &&&& .ant-table-cell {
    padding: 4px 8px;
  }

  &&& :not(.ant-table-header) > .rc-virtual-list {
    & .ant-table-row.${SELECTED_ROW_CLASSNAME} {
      background-color: var(--color-dropdown-selected);
      color: var(--color-button);

      & > .ant-table-cell {
        /* Prevent hovering from changing background color */
        background-color: transparent;
      }
    }

    & .ant-table-cell:not(:has(.ant-btn)) {
      /* Correction for a bug in virtual lists where text elements were not
      * centered vertically */
      display: flex;
      align-items: center;
    }
  }
`;

type AnnotationTableProps = {
  onClickObjectRow: (record: TableDataType) => void;
  onClickDeleteObject: (record: TableDataType) => void;
  dataset: Dataset | null;
  ids: number[];
  idToValue?: Map<number, string>;
  height?: number | string;
  hideTrackColumn?: boolean;
  selectedId?: number;
};

const defaultProps = {
  height: "100%",
  hideTrackColumn: false,
  selectedId: -1,
};

/**
 * Renders a list of annotated IDs in a table format, with click and delete
 * interactions.
 */
const AnnotationDisplayTable = memo(function AnnotationDisplayTable(inputProps: AnnotationTableProps): ReactElement {
  const props = { ...defaultProps, ...inputProps };
  const theme = useContext(AppThemeContext);

  const tableColumns: TableProps<TableDataType>["columns"] = [
    // {
    //   title: "Object ID",
    //   dataIndex: "id",
    //   key: "id",
    //   width: "20%",
    //   sorter: (a, b) => a.id - b.id,
    // },
    {
      title: "Label ID",
      dataIndex: "segId",
      key: "segId",
      width: "20%",
      sorter: (a, b) => a.segId - b.segId,
    },
    {
      title: "Track ID",
      dataIndex: "track",
      key: "track",
      width: "20%",
      sorter: (a, b) => a.track - b.track,
    },
    {
      title: "Time",
      dataIndex: "time",
      key: "time",
      width: "20%",
      sorter: (a, b) => a.time - b.time,
    },
    // Column that contains a remove button for the ID.
    {
      title: "",
      key: "action",
      width: "5%",
      render: (_, record) => (
        <div style={{ display: "flex", justifyContent: "right" }}>
          <IconButton
            type="hint"
            sizePx={20}
            onClick={(event) => {
              // Rows have their own behavior on click (jumping to a timestamp),
              // so we need to stop event propagation so that the row click event
              // doesn't fire.
              event.stopPropagation();
              props.onClickDeleteObject(record);
            }}
          >
            <CloseOutlined style={{ width: "12px" }} />
            <VisuallyHidden>
              Remove ID {record.id} (track {record.track})
            </VisuallyHidden>
          </IconButton>
        </div>
      ),
    },
  ];

  if (props.idToValue) {
    tableColumns.splice(3, 0, {
      title: "Value",
      dataIndex: "value",
      key: "value",
      width: "40%",
      sorter: (a, b) => a.value.localeCompare(b.value),
    });
  }

  if (props.hideTrackColumn) {
    tableColumns.splice(1, 1);
  }

  const tableData: TableDataType[] = useMemo(() => {
    const dataset = props.dataset;
    if (dataset) {
      return props.ids.map((id) => {
        const segId = dataset.getSegmentationId(id);
        const track = dataset.getTrackId(id);
        const time = dataset.getTime(id);
        const value = props.idToValue?.get(id) ?? "";
        return { key: id.toString(), id, segId, track, time, value };
      });
    }
    return [];
  }, [props.ids, props.dataset, props.idToValue]);

  return (
    <StyledAntTable
      rowClassName={(record) => (record.id === props.selectedId ? SELECTED_ROW_CLASSNAME : "")}
      dataSource={tableData}
      columns={tableColumns}
      size="small"
      pagination={false}
      virtual={true}
      scroll={{ y: props.height }}
      // TODO: Rows aren't actually buttons, which means that they are not
      // keyboard accessible. Either find a way to make them tab indexable
      // or add a button that is equivalent to click?
      onRow={(record) => {
        return {
          onClick: () => {
            props.onClickObjectRow(record);
          },
        };
      }}
      locale={{
        emptyText: (
          <FlexColumnAlignCenter style={{ margin: "16px 0 10px 0", color: theme.color.text.disabled }}>
            <TagIconSVG style={{ width: "24px", height: "24px", marginBottom: 0 }} />
            <p>No annotated IDs</p>
          </FlexColumnAlignCenter>
        ),
      }}
    ></StyledAntTable>
  );
});

export default AnnotationDisplayTable;
