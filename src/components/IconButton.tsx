import React, { PropsWithChildren, ReactElement, useContext } from "react";
import styles from "./IconButton.module.css";
import { Button, ConfigProvider } from "antd";
import { ThemeContext } from "./AppStyle";

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
  const themeContext = useContext(ThemeContext);

  return (
    <ConfigProvider theme={{ components: { Button: { colorPrimaryActive: themeContext.color.button.hover } } }}>
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
