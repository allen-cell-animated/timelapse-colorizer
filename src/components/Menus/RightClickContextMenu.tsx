import { ConfigProvider, Menu, type MenuProps, Popover } from "antd";
import type { MenuInfo } from "rc-menu/lib/interface";
import React, {
  type PropsWithChildren,
  type ReactElement,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import styled, { css } from "styled-components";

import { MenuExpandArrowSVG } from "src/assets";
import { FlexColumn } from "src/styles/utils";

// MARK: Types

type MenuItem = Required<MenuProps>["items"][number];
type ClickHandler = (event: React.MouseEvent<HTMLElement, MouseEvent> | React.KeyboardEvent<HTMLElement>) => void;

export type ContextMenuItem = {
  key?: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  onClick?: ClickHandler;
  visible?: boolean;
  disabled?: boolean;

  /**
   * An array of context menu items that will be displayed as a submenu. If
   * provided as a nested array, items in each sub-array will be grouped in the
   * submenu.
   */
  children?: ContextMenuItem[][] | ContextMenuItem[];
};

type RightClickContextMenuProps = {
  id?: string;
  /**
   * The items to display in the context menu. Items can have labels, icons,
   * click handlers, and children that are grouped into submenus.
   *
   * When `items` is a nested array, items in each sub-array will be grouped
   * together in the menu, with a divider drawn between each group.
   */
  items: ContextMenuItem[][] | ContextMenuItem[];
};

// MARK: Styling

const StyledPopoverContainer = styled.div<{ $hasIcon?: boolean }>(
  ({ $hasIcon }) => css`
    // Position popover container totally over the child element that it wraps
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    width: 100%;

    // Pass pointer events through the popover container to the child content
    // container, except for the popover itself.
    pointer-events: none;
    & .ant-popover {
      pointer-events: auto;
    }

    & .ant-popover-inner {
      border-radius: 8px;
      overflow: hidden;
      padding: 0px 0;
    }

    // Remove the vertical spacing bar from the right edge of the menu
    & .ant-menu.ant-menu-light.ant-menu-root.ant-menu-vertical {
      border-inline-end: none;
    }

    // TODO: The following style adjustments do not apply to submenus, due to
    // Ant positioning them outside of the popup container (appended to
    // document.body). In Ant 6, this can be edited through ConfigProvider +
    // Semantic DOM.

    // When icons are used, align titles consistently for items with/without.
    --icon-padding-px: ${$hasIcon ? "8px" : "0px"};
    --icon-width-px: ${$hasIcon ? "13px" : "0px"};
    & span.ant-menu-title-content {
      margin-inline-start: calc(var(--icon-width-px) + var(--icon-padding-px)) !important;
    }
    & * + span.ant-menu-title-content {
      margin-inline-start: var(--icon-padding-px) !important;
    }

    // Remove spacing between sibling menu elements for compactness
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
  `
);

// MARK: Helper methods

function groupContextMenuItems(items: ContextMenuItem[] | ContextMenuItem[][]): ContextMenuItem[][] {
  if (Array.isArray(items) && items.length > 0 && Array.isArray(items[0])) {
    return items as ContextMenuItem[][];
  }
  return [items as ContextMenuItem[]];
}

/**
 * Converts context menu items into Ant Menu items recursively.
 * @param itemGroups The context menu items, or groups of items, to convert.
 * Keys will be automatically assigned.
 * @param clickHandlerMap Map to populate, mapping item keys to their
 * corresponding click handlers.
 * @returns An array of Ant Menu items.
 */
function itemsToMenuItemsRecursive(
  itemGroups: ContextMenuItem[][] | ContextMenuItem[],
  clickHandlerMap: Map<string, ClickHandler>
): MenuItem[] {
  const groupedMenuItems = groupContextMenuItems(itemGroups).map((items) =>
    items
      .filter((item) => item.visible !== false)
      .map((item) => {
        const key = item.key ?? clickHandlerMap.size.toString();
        if (clickHandlerMap.has(key)) {
          console.warn(
            `Duplicate key '${key}' detected when parsing items for right click context menu. This will cause incorrect click handlers to be fired.`
          );
        }
        clickHandlerMap.set(key, item.onClick ?? (() => {}));
        const menuItem: MenuItem = {
          key: key,
          label: item.label,
          icon: item.icon,
          disabled: item.disabled,
          children: item.children ? itemsToMenuItemsRecursive(item.children, clickHandlerMap) : undefined,
          popupOffset: [0, 0],
        };
        return menuItem;
      })
  );
  // Flatten + add dividers between each group
  return groupedMenuItems
    .filter((group) => group.length > 0)
    .flatMap((group, index) => {
      if (index === 0) {
        return group;
      }
      return [{ type: "divider", key: `divider-${index}` }, ...group];
    });
}

function getMenuItems(items: ContextMenuItem[] | ContextMenuItem[][]): {
  items: MenuItem[];
  keyToClickHandlerMap: Map<string, ClickHandler>;
} {
  const clickHandlerMap = new Map<string, ClickHandler>();
  const menuItems = itemsToMenuItemsRecursive(items, clickHandlerMap);
  return { items: menuItems, keyToClickHandlerMap: clickHandlerMap };
}

function doesItemHaveIcon(item: MenuItem): boolean {
  if (item && (item.type === "item" || item.type === "submenu")) {
    if (item.icon) {
      return true;
    }
    if (item.type === "submenu" && item.children) {
      return item.children.flat().some(doesItemHaveIcon);
    }
  }
  return false;
}

// MARK: Component

/**
 * Wraps the children to intercept and display a custom context menu on right
 * click.
 *
 * Menu items + click handlers will only update when the context menu is first
 * opened, to prevent rapid changes to the UI.
 */
function RightClickContextMenu(props: PropsWithChildren<RightClickContextMenuProps>): ReactElement {
  const defaultId = useId();
  const id = props.id ?? defaultId;

  const contentContainerRef = useRef<HTMLDivElement>(null);
  const popoverContainerRef = useRef<HTMLDivElement>(null);
  const popoverAnchorRef = useRef<HTMLDivElement>(null);

  const inputItemsRef = useRef(props.items);
  inputItemsRef.current = props.items;

  // Stored as state so that the menu items remain consistent even if the input
  // items change, and only update when the context menu is opened/reopened.
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [keyToClickHandlerMap, setKeyToClickHandlerMap] = useState<Map<string, ClickHandler>>(new Map());

  const [showContextMenu, _setShowContextMenu] = useState(false);

  const setShowContextMenu = useCallback((value: boolean) => {
    _setShowContextMenu(value);
    if (value) {
      // Update current menu items and click handlers
      const { items, keyToClickHandlerMap } = getMenuItems(inputItemsRef.current);
      setMenuItems(items);
      setKeyToClickHandlerMap(keyToClickHandlerMap);
    }
  }, []);

  const hasIcons = useMemo(() => menuItems.some(doesItemHaveIcon), [menuItems]);

  // MARK: Event listener

  useEffect(() => {
    const popoverAnchor = popoverAnchorRef.current;
    const container = contentContainerRef.current;
    if (!container || !popoverAnchor) {
      return;
    }

    const updatePopoverPosition = (ev: MouseEvent): void => {
      const rect = container.getBoundingClientRect();
      popoverAnchor.style.left = `${ev.clientX - rect.left}px`;
      popoverAnchor.style.top = `${ev.clientY - rect.top}px`;
    };
    const onContextMenu = (ev: MouseEvent): void => {
      ev.preventDefault();
      ev.stopPropagation();
      updatePopoverPosition(ev);
      setShowContextMenu(true);
    };

    const onEscapePressed = (ev: KeyboardEvent): void => {
      if (ev.key === "Escape") {
        setShowContextMenu(false);
      }
    };

    // Note: contextmenu event is not supported on Safari mobile
    container.addEventListener("contextmenu", onContextMenu);
    window.addEventListener("keydown", onEscapePressed);
    return () => {
      container.removeEventListener("contextmenu", onContextMenu);
      window.removeEventListener("keydown", onEscapePressed);
    };
  }, [setShowContextMenu]);

  // MARK: Menu click handling

  const onClickMenuItem = useMemo(
    () =>
      (info: MenuInfo): void => {
        const clickHandler = keyToClickHandlerMap.get(info.key);
        if (clickHandler) {
          clickHandler(info.domEvent);
          setShowContextMenu(false);
        }
      },
    [keyToClickHandlerMap]
  );

  const menu = useMemo(
    () => (
      <FlexColumn>
        <Menu
          items={menuItems}
          onClick={onClickMenuItem}
          mode="vertical"
          selectedKeys={[]}
          expandIcon={<MenuExpandArrowSVG />}
        ></Menu>
      </FlexColumn>
    ),
    [menuItems, onClickMenuItem]
  );

  return (
    <div id={id} style={{ position: "relative" }}>
      <div ref={contentContainerRef} style={{ width: "100%", height: "100%" }}>
        {props.children}
      </div>

      <StyledPopoverContainer ref={popoverContainerRef} $hasIcon={hasIcons}>
        <ConfigProvider
          theme={{
            components: {
              Menu: {
                fontSize: 13,
                itemHeight: 30,
                controlPaddingHorizontal: 0,
              },
            },
          }}
        >
          <Popover
            content={menu}
            open={showContextMenu}
            onOpenChange={(open) => {
              setShowContextMenu(open);
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

export default RightClickContextMenu;
