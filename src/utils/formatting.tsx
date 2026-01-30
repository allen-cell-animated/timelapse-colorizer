import React, { type ReactElement, type ReactNode } from "react";
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
 * Renders a string array as JSX react elements, handling formatting for lists and paragraph text.
 * @param items List of string text items (or ReactNode elements) to render.
 * @param containerStyle optional CSS properties object that will be applied to the container div.
 * @returns A list of one or more text elements, wrapped in a styling div.
 *
 * String items will be returned as one of the following:
 * - If it starts with "- ", the item will be rendered as a list item (`li`) element. Groups of `li` elements
 * will be wrapped in a unordered list (`ul`) element.
 * - Otherwise, the item is wrapped in a `p` element.
 *
 * Non-string items will be returned as-is.
 */
export function renderStringArrayAsJsx(items: ReactNode[] | string[] | string | undefined): ReactElement | undefined {
  if (!items || items.length === 0) {
    return undefined;
  }
  if (typeof items === "string") {
    return (
      <RenderedStringContainer>
        <p>{items}</p>
      </RenderedStringContainer>
    );
  }

  const elements: ReactNode[] = [];
  let currListElements: ReactNode[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (typeof item === "string" && item.trim().startsWith("- ")) {
      currListElements.push(<li key={currListElements.length}>{item.trim().substring(2)}</li>);
    } else {
      if (currListElements.length > 0) {
        elements.push(<ul key={i - 1}>{currListElements}</ul>);
        currListElements = [];
      }
      if (typeof item === "string") {
        elements.push(<p key={i}>{item}</p>);
      } else {
        elements.push(item);
      }
    }
  }

  if (currListElements.length > 0) {
    elements.push(<ul key={items.length}>{currListElements}</ul>);
  }

  return <RenderedStringContainer>{elements}</RenderedStringContainer>;
}

/**
 * Formats a quantity string, using either the singular or plural form.
 * @param quantity count of items.
 * @param singular the singular form of the item name
 * @param plural the plural form of the item name
 * @returns a string formatted as "{quantity} {singular/plural}"
 */
export function formatQuantityString(quantity: number, singular: string, plural: string): string {
  return `${quantity} ${quantity === 1 ? singular : plural}`;
}
