import { ConfigProvider, Menu, type MenuProps, Popover } from "antd";
import { MenuInfo } from "rc-menu/lib/interface";
import React, { PropsWithChildren, ReactElement, useCallback, useEffect, useMemo, useState } from "react";
import styled from "styled-components";

import { MenuExpandArrowSVG } from "src/assets";
import { FlexColumn } from "src/styles/utils";

// MARK: Types

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

type RightClickContextMenuProps = {
  /**
   * The items to display in the context menu. Items can have labels, icons,
   * click handlers, and can be nested to create submenus.
   *
   * Each sub-array represents a separate group of context menu items.
   */
  items: ContextMenuItem[][] | ContextMenuItem[];
};

// MARK: Styling

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
  }

  // Remove spacing between sibling menu elements

  // TODO: this does not apply to submenus, due to Ant positioning them outside
  // of the popup container. Once upgraded to Ant 6, this can be edited through
  // ConfigProvider + Semantic DOM.
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

// MARK: Helper methods

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

// MARK: Component

/**
 * Wraps the children to intercept and display a custom context menu on right
 * click.
 *
 * Menu items + click handlers will only update when the context menu is first
 * opened, to prevent rapid changes to the UI.
 */
export default function RightClickContextMenu(props: PropsWithChildren<RightClickContextMenuProps>): ReactElement {
  const contentContainerRef = React.useRef<HTMLDivElement>(null);
  const popoverContainerRef = React.useRef<HTMLDivElement>(null);
  const popoverAnchorRef = React.useRef<HTMLDivElement>(null);

  const inputItemsRef = React.useRef(props.items);
  inputItemsRef.current = props.items;

  // Stored as state so that the menu items remain consistent even if the input
  // items change, and only update when the context menu is reopened.
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [keyToClickHandlerMap, setKeyToClickHandlerMap] = useState<Map<string, ClickHandler>>(new Map());

  const [showContextMenu, _setShowContextMenu] = useState(false);
  const showContextMenuRef = React.useRef(showContextMenu);

  const setShowContextMenu = useCallback((value: boolean) => {
    _setShowContextMenu(value);
    showContextMenuRef.current = value;
    if (value) {
      // Update current menu items and click handlers
      setMenuItems(contextMenuItemsToMenuItems(inputItemsRef.current));
      setKeyToClickHandlerMap(getKeyToClickHandlerMap(inputItemsRef.current));
    }
  }, []);

  // MARK: Event listener

  useEffect(() => {
    const popoverAnchor = popoverAnchorRef.current;
    const container = contentContainerRef.current;
    if (!container || !popoverAnchor) {
      return;
    }

    const updatePopoverPosition = (ev: MouseEvent): void => {
      if (!showContextMenuRef.current) {
        const rect = container.getBoundingClientRect();
        popoverAnchor.style.left = `${ev.clientX - rect.left}px`;
        popoverAnchor.style.top = `${ev.clientY - rect.top}px`;
      }
    };
    const onContextMenu = (ev: PointerEvent): void => {
      ev.preventDefault();
      ev.stopPropagation();
      updatePopoverPosition(ev);
      setShowContextMenu(true);
    };

    container.addEventListener("contextmenu", onContextMenu);
    return () => {
      container.removeEventListener("contextmenu", onContextMenu);
    };
  }, [setShowContextMenu]);

  // MARK: Menu click handling

  const onClickMenuItem = useMemo(
    () =>
      (info: MenuInfo): void => {
        const clickHandler = keyToClickHandlerMap.get(info.key);
        if (clickHandler) {
          clickHandler(info.domEvent as React.MouseEvent<HTMLDivElement, MouseEvent>);
          setShowContextMenu(false);
        }
      },
    [keyToClickHandlerMap]
  );

  const menu = (
    <FlexColumn>
      <Menu
        items={menuItems}
        onClick={onClickMenuItem}
        mode="vertical"
        selectedKeys={[]}
        expandIcon={<MenuExpandArrowSVG />}
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
