import { Menu, type MenuProps, Popover } from "antd";
import React, { PropsWithChildren, ReactElement, useEffect, useState } from "react";
import styled from "styled-components";

import { FlexColumn } from "src/styles/utils";

type MenuItem = Required<MenuProps>["items"][number];

type ClickHandler = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;

type ContextMenuItem = {
  key: string;
  label: string;
  icon?: React.ReactNode;
  onClick?: ClickHandler;
  visible?: boolean | (() => boolean);
  disabled?: boolean | (() => boolean);

  children?: ContextMenuItem[];
};

const StyledPopoverContainer = styled.div`
  & .ant-popover-inner {
    border-radius: 8px;
    overflow: hidden;
    padding: 0px;
  }

  & .ant-menu.ant-menu-light.ant-menu-root.ant-menu-vertical {
    border-inline-end: none;
  }
`;

function contextMenuItemsToMenuItems(items: ContextMenuItem[]): MenuItem[] {
  return items
    .filter((item) => (typeof item.visible === "function" ? item.visible() : item.visible !== false))
    .map((item) => {
      const menuItem: MenuItem = {
        key: item.key,
        label: item.label,
        icon: item.icon,
        disabled: typeof item.disabled === "function" ? item.disabled() : item.disabled,
        children: item.children ? contextMenuItemsToMenuItems(item.children) : undefined,
      };
      return menuItem;
    });
}

function getKeyToClickHandlerMap(items: ContextMenuItem[]): Map<string, ClickHandler> {
  const map = new Map<string, ClickHandler>();

  function addItemToMap(item: ContextMenuItem) {
    map.set(item.key, item.onClick ?? (() => {}));
    if (item.children) {
      item.children.forEach(addItemToMap);
    }
  }

  items.forEach(addItemToMap);
  return map;
}

type RightClickContextMenuProps = {
  items?: ContextMenuItem[];
};

const defaultProps: Partial<RightClickContextMenuProps> = {
  items: [
    {
      key: "default",
      label: "Placeholder Item",
      onClick: () => {
        console.log("Default item clicked");
      },
    },
  ],
};

export default function RightClickContextMenu(inputProps: PropsWithChildren<RightClickContextMenuProps>): ReactElement {
  const props = { ...defaultProps, ...inputProps } as PropsWithChildren<Required<RightClickContextMenuProps>>;
  const contentContainerRef = React.useRef<HTMLDivElement>(null);
  const popoverContainerRef = React.useRef<HTMLDivElement>(null);
  const [showContextMenu, setShowContextMenu] = useState(false);

  const onContextMenu = (ev: PointerEvent): void => {
    ev.preventDefault();
    ev.stopPropagation();
    setShowContextMenu(true);
  };

  useEffect(() => {
    const container = contentContainerRef.current;
    if (!container) {
      return;
    }
    container.addEventListener("contextmenu", onContextMenu);
    return () => {
      container.removeEventListener("contextmenu", onContextMenu);
    };
  }, []);

  const onClickMenuItem = (event: React.MouseEvent<HTMLDivElement, MouseEvent>): void => {};

  const menu = (
    <FlexColumn>
      <Menu
        items={contextMenuItemsToMenuItems(props.items)}
        onClick={(info) => {
          console.log("Clicked ", info);
        }}
      ></Menu>
    </FlexColumn>
  );

  return (
    <div>
      <div ref={contentContainerRef} style={{ width: "100%", height: "100%" }}>
        {props.children}
      </div>
      <StyledPopoverContainer ref={popoverContainerRef}>
        <Popover
          content={menu}
          open={showContextMenu}
          onOpenChange={setShowContextMenu}
          getPopupContainer={() => popoverContainerRef.current ?? document.body}
          placement="right"
          style={{ padding: 0 }}
          trigger={["click", "contextMenu"]}
        >
          <div style={{ position: "absolute", top: 0, left: 0 }}></div>
        </Popover>
      </StyledPopoverContainer>
    </div>
  );
}
