import React, { PropsWithChildren, ReactElement } from "react";
import styles from "./IconButton.module.css";
import { Button, ConfigProvider } from "antd";
import { COLOR_THEME_LIGHT } from "../constants/theme";

type IconButtonProps = {
  onClick?: () => void;
};

export default function IconButton(props: PropsWithChildren<IconButtonProps>): ReactElement {
  return (
    <ConfigProvider theme={{ components: { Button: { colorPrimaryActive: COLOR_THEME_LIGHT } } }}>
      <Button type="primary" className={styles.iconButton}>
        {props.children}
      </Button>
    </ConfigProvider>
  );
}
