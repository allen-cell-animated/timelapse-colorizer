import { Upload } from "antd";
import styled from "styled-components";

/** Ant Upload with font size and hover color adjustments. */
export const StyledUpload = styled(Upload.Dragger)`
  &&& {
    color: var(--color-text-hint);
    & * {
      transition: all 0.2s ease-in-out;
    }

    & .ant-upload-drag-container span {
      font-size: var(--font-size-header);
    }

    &:hover {
      color: var(--color-text-theme);
    }
  }
`;
