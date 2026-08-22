import { ConfigProvider, Menu, type MenuProps, Popover } from "antd";
import { MenuInfo } from "rc-menu/lib/interface";
import React, { PropsWithChildren, ReactElement, useEffect, useState } from "react";
import styled from "styled-components";

import { FlexColumn } from "src/styles/utils";

type MenuItem = Required<MenuProps>["items"][number];

type ClickHandler = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;

export type ContextMenuItem = {
  key: string;
  label: string;
  icon?: React.ReactNode;
  onClick?: ClickHandler;
  visible?: boolean | (() => boolean);
  disabled?: boolean | (() => boolean);

  children?: ContextMenuItem[][] | ContextMenuItem[];
};

const StyledPopoverContainer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  width: 100%;
  pointer-events: none;

  & .ant-popover {
    pointer-events: auto;
  }

  & .ant-popover-inner {
    border-radius: 8px;
    overflow: hidden;
    padding: 0px 0;
  }

  & .ant-menu.ant-menu-light.ant-menu-root.ant-menu-vertical {
    border-inline-end: none;
    /* width: max-content; */
  }

  .ant-menu-submenu:not(:first-of-type):not(.ant-menu-item-divider + .ant-menu-submenu),
  .ant-menu-item:not(:first-of-type):not(.ant-menu-item-divider + .ant-menu-item) {
    margin-top: 0;
    & > .ant-menu-submenu-title {
      margin-top: 0;
    }
  }

  .ant-menu-submenu:not(:last-child):not(:has(+ .ant-menu-item-divider)),
  .ant-menu-item:not(:last-child):not(:has(+ .ant-menu-item-divider)) {
    margin-bottom: 0;
    & > .ant-menu-submenu-title {
      margin-bottom: 0;
    }
  }
`;

function groupContextMenuItems(items: ContextMenuItem[] | ContextMenuItem[][]): ContextMenuItem[][] {
  if (Array.isArray(items) && items.length > 0 && Array.isArray(items[0])) {
    return items as ContextMenuItem[][];
  }
  return [items as ContextMenuItem[]];
}

function contextMenuItemsToMenuItems(itemGroups: ContextMenuItem[][] | ContextMenuItem[]): MenuItem[] {
  const groupedMenuItems = groupContextMenuItems(itemGroups).map((items) =>
    items
      .filter((item) => (typeof item.visible === "function" ? item.visible() : item.visible !== false))
      .map((item) => {
        const menuItem: MenuItem = {
          key: item.key,
          label: item.label,
          icon: item.icon,
          disabled: typeof item.disabled === "function" ? item.disabled() : item.disabled,
          children: item.children ? contextMenuItemsToMenuItems(item.children) : undefined,
          popupOffset: [0, 0],
        };
        return menuItem;
      })
  );
  // Flatten + add dividers between each group
  return groupedMenuItems.flatMap((group, index) => {
    if (index === 0) {
      return group;
    }
    return [{ type: "divider", key: `divider-${index}` }, ...group];
  });
}

function getKeyToClickHandlerMap(items: ContextMenuItem[] | ContextMenuItem[][]): Map<string, ClickHandler> {
  const map = new Map<string, ClickHandler>();

  function addItemToMap(item: ContextMenuItem) {
    map.set(item.key, item.onClick ?? (() => {}));
    if (item.children) {
      item.children.flat().forEach(addItemToMap);
    }
  }

  items.flat(2).forEach(addItemToMap);
  return map;
}

type RightClickContextMenuProps = {
  /**
   * The items to display in the context menu. Items can have labels, icons,
   * click handlers, and can be nested to create submenus.
   *
   * Each sub-array represents a separate group of context menu items.
   */
  items?: ContextMenuItem[][];
};

const defaultProps: Partial<RightClickContextMenuProps> = {
  items: [
    [
      {
        key: "default",
        label: "Placeholder Item",
        onClick: () => {
          console.log("Clicked placeholder item");
        },
      },
    ],
  ],
};

export default function RightClickContextMenu(inputProps: PropsWithChildren<RightClickContextMenuProps>): ReactElement {
  const props = { ...defaultProps, ...inputProps } as PropsWithChildren<Required<RightClickContextMenuProps>>;
  const contentContainerRef = React.useRef<HTMLDivElement>(null);
  const popoverContainerRef = React.useRef<HTMLDivElement>(null);
  const popoverAnchorRef = React.useRef<HTMLDivElement>(null);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const showContextMenuRef = React.useRef(showContextMenu);

  // MARK: Event listeners

  useEffect(() => {
    const container = contentContainerRef.current;
    if (!container) {
      return;
    }

    const onContextMenu = (ev: PointerEvent): void => {
      ev.preventDefault();
      ev.stopPropagation();
      setShowContextMenu(true);
      showContextMenuRef.current = true;
    };

    const onMouseMove = (ev: MouseEvent): void => {
      if (popoverAnchorRef.current && contentContainerRef.current && !showContextMenuRef.current) {
        popoverAnchorRef.current.style.left = `${
          ev.clientX - contentContainerRef.current.getBoundingClientRect().left
        }px`;
        popoverAnchorRef.current.style.top = `${
          ev.clientY - contentContainerRef.current.getBoundingClientRect().top
        }px`;
      }
    };

    const onMouseDown = (ev: MouseEvent): void => {
      // On right click, readjust position
      if (ev.button === 2) {
        onMouseMove(ev);
      }
    };

    container.addEventListener("contextmenu", onContextMenu);
    container.addEventListener("mousemove", onMouseMove);
    container.addEventListener("mousedown", onMouseDown);
    return () => {
      container.removeEventListener("contextmenu", onContextMenu);
      container.removeEventListener("mousemove", onMouseMove);
      container.removeEventListener("mousedown", onMouseDown);
    };
  }, []);

  // MARK: Menu click handling

  const keyToClickHandlerMap = getKeyToClickHandlerMap(props.items);
  const onClickMenuItem = (info: MenuInfo): void => {
    const clickHandler = keyToClickHandlerMap.get(info.key);
    if (clickHandler) {
      clickHandler(info.domEvent as React.MouseEvent<HTMLDivElement, MouseEvent>);
      setShowContextMenu(false);
    }
  };

  const menu = (
    <FlexColumn>
      <Menu
        items={contextMenuItemsToMenuItems(props.items)}
        onClick={onClickMenuItem}
        mode="vertical"
        selectedKeys={[]}
      ></Menu>
    </FlexColumn>
  );

  return (
    <div>
      <div ref={contentContainerRef} style={{ width: "100%", height: "100%" }}>
        {props.children}
      </div>

      <StyledPopoverContainer ref={popoverContainerRef} id="right-click-context-menu-popover-container">
        <ConfigProvider
          theme={{
            components: {
              Menu: {
                fontSize: 13,
                itemHeight: 30,
              },
            },
          }}
        >
          <Popover
            content={menu}
            open={showContextMenu}
            onOpenChange={(open) => {
              setShowContextMenu(open);
              showContextMenuRef.current = open;
            }}
            getPopupContainer={() => popoverContainerRef.current ?? document.body}
            placement="rightTop"
            style={{ padding: 0 }}
            trigger={["click", "contextMenu"]}
            arrow={false}
          >
            <div ref={popoverAnchorRef} style={{ position: "absolute", height: "1px", width: "1px" }}></div>
          </Popover>
        </ConfigProvider>
      </StyledPopoverContainer>
    </div>
  );
}
