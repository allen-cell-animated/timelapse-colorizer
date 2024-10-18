import React, { ReactNode } from "react";
import styled from "styled-components";

export const RenderedStringContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;

  & > p,
  & > ul {
    margin: 0;
  }
`;

/**
 * Renders a text string array as JSX react elements, handling formatting for lists and paragraph text.
 * @param items List of string text items to render.
 * @param containerStyle optional CSS properties object that will be applied to the container div.
 * @returns A list of one or more text elements, wrapped in a styled div.
 * String items will be returned as one of the following:
 * - If it starts with "- ", the item will be rendered as a `li` element. Groups of `li` elements will be wrapped in a `ul` element.
 * - Otherwise, the item is wrapped in a `p` element.
 */
export function renderStringArrayAsJsx(items: string[] | string | undefined): ReactNode {
  if (!items) {
    return undefined;
  }
  if (typeof items === "string") {
    return <p>{items}</p>;
  }

  const elements: ReactNode[] = [];
  let listElements: ReactNode[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i].trim();
    if (item.startsWith("- ")) {
      listElements.push(<li key={listElements.length}>{item.substring(2)}</li>);
      continue;
    } else {
      if (listElements.length > 0) {
        elements.push(<ul key={i - 1}>{listElements}</ul>);
        listElements = [];
      }
      elements.push(<p key={i}>{item}</p>);
    }
  }

  if (listElements.length > 0) {
    elements.push(<ul key={items.length}>{listElements}</ul>);
  }

  return <RenderedStringContainer>{elements}</RenderedStringContainer>;
}
