import React, { ReactElement, ReactNode } from "react";
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
 * @returns A list of one or more text elements, wrapped in a styling div.
 * String items will be returned as one of the following:
 * - If it starts with "- ", the item will be rendered as a list item (`li`) element. Groups of `li` elements
 * will be wrapped in a unordered list (`ul`) element.
 * - Otherwise, the item is wrapped in a `p` element.
 */
export function renderStringArrayAsJsx(items: string[] | string | undefined): ReactElement {
  if (!items || items.length === 0) {
    return <></>;
  }
  if (typeof items === "string") {
    return (
      <RenderedStringContainer>
        <p>{items}</p>;
      </RenderedStringContainer>
    );
  }

  const elements: ReactNode[] = [];
  let currListElements: ReactNode[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i].trim();
    if (item.startsWith("- ")) {
      currListElements.push(<li key={currListElements.length}>{item.substring(2)}</li>);
      continue;
    } else {
      if (currListElements.length > 0) {
        elements.push(<ul key={i - 1}>{currListElements}</ul>);
        currListElements = [];
      }
      elements.push(<p key={i}>{item}</p>);
    }
  }

  if (currListElements.length > 0) {
    elements.push(<ul key={items.length}>{currListElements}</ul>);
  }

  return <RenderedStringContainer>{elements}</RenderedStringContainer>;
}
