import React, { PropsWithChildren, ReactElement } from "react";
import styles from "./IconButton.module.css";
import { Button, ConfigProvider } from "antd";
import { COLOR_THEME_LIGHT } from "../constants/theme";

type IconButtonProps = {
  onClick?: () => void;
  disabled?: boolean;
  type?: "outlined" | "primary";
};

/**
 * Custom styled button intended to hold a single icon passed in as a child.
 * @params onClick: The callback fired when a click event occurs.
 *
 * @example
 * <IconButton onClick={myClickHandler}>
 *    <PauseOutlined /> // From Antd Icons
 * </IconButton>
 */
export default function IconButton(props: PropsWithChildren<IconButtonProps>): ReactElement {
  return (
    <ConfigProvider theme={{ components: { Button: { colorPrimaryActive: COLOR_THEME_LIGHT } } }}>
      <Button
        type="primary"
        className={styles.iconButton + " " + styles[props.type || "primary"]}
        disabled={props.disabled}
        onClick={props.onClick}
      >
        {props.children}
      </Button>
    </ConfigProvider>
  );
}
