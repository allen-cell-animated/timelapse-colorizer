import { CloseOutlined } from "@ant-design/icons";
import { Table, TableProps } from "antd";
import React, { memo, ReactElement, useMemo } from "react";
import styled from "styled-components";

import { TagIconSVG } from "../../../assets";
import { Dataset } from "../../../colorizer";
import { FlexColumnAlignCenter, VisuallyHidden } from "../../../styles/utils";

import IconButton from "../../IconButton";

export type TableDataType = {
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

type AnnotationTableProps = {
  onClickObjectRow: (record: TableDataType) => void;
  onClickDeleteObject: (record: TableDataType) => void;
  dataset: Dataset | null;
  ids: number[];
  height?: number | string;
  hideTrackColumn?: boolean;
};

const defaultProps = {
  height: "100%",
  hideTrackColumn: false,
};

/**
 * Renders a list of annotated IDs in a table format, with click and delete
 * interactions.
 */
const AnnotationDisplayTable = memo(function AnnotationDisplayTable(inputProps: AnnotationTableProps): ReactElement {
  const props: Required<AnnotationTableProps> = { ...defaultProps, ...inputProps };

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
            props.onClickDeleteObject(record);
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

  if (props.hideTrackColumn) {
    tableColumns.splice(1, 1);
  }

  const tableData: TableDataType[] = useMemo(() => {
    const dataset = props.dataset;
    if (dataset) {
      return props.ids.map((id) => {
        const track = dataset.getTrackId(id);
        const time = dataset.getTime(id);
        return { key: id.toString(), id, track, time };
      });
    }
    return [];
  }, [props.ids, props.dataset]);

  return (
    <StyledAntTable
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
          <FlexColumnAlignCenter style={{ margin: "16px 0 10px 0" }}>
            <TagIconSVG style={{ width: "24px", height: "24px", marginBottom: 0 }} />
            <p>No annotated IDs</p>
          </FlexColumnAlignCenter>
        ),
      }}
    ></StyledAntTable>
  );
});

export default AnnotationDisplayTable;
