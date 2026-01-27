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
 * Renders a text string array as JSX react elements, handling formatting for lists and paragraph text.
 * @param items List of string text items to render.
 * @param containerStyle optional CSS properties object that will be applied to the container div.
 * @returns A list of one or more text elements, wrapped in a styling div.
 * String items will be returned as one of the following:
 * - If it starts with "- ", the item will be rendered as a list item (`li`) element. Groups of `li` elements
 * will be wrapped in a unordered list (`ul`) element.
 * - Otherwise, the item is wrapped in a `p` element.
 */
export function renderStringArrayAsJsx(items: string[] | string | undefined): ReactElement | undefined {
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
    const item = items[i].trim();
    if (item.startsWith("- ")) {
      currListElements.push(<li key={currListElements.length}>{item.substring(2)}</li>);
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

/**
 * Inserts the provided separator element between each element in the array and returns
 * as a new array.
 */
export function insertBetweenElements(
  elements: ReactNode | ReactNode[],
  separator: ReactElement | ((index: number) => ReactElement)
): ReactNode {
  if (!elements) {
    return elements;
  }
  const elementList: ReactNode[] = [];
  const elementsArray = (Array.isArray(elements) ? elements : [elements]).filter((el) => !!el);
  for (let i = 0; i < elementsArray.length; i++) {
    elementList.push(elementsArray[i]);
    if (i < elementsArray.length - 1) {
      elementList.push(typeof separator === "function" ? separator(2 * i + 1) : separator);
    }
  }
  return elementList;
}

export function capitalizeFirstLetter(str: string): string {
  if (str.length === 0) {
    return str;
  }
  return str.charAt(0).toUpperCase() + str.slice(1);
}
