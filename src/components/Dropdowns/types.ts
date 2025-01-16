import { ReactNode } from "react";
import { Color } from "three";

/**
 * A single option in a dropdown. Includes optional display properties.
 */
export type SelectItem = {
  /** Display value of the option. */
  label: string;
  /** The key or value the option. This will be returned when the option is
   * selected.
   */
  value: string;
  /** Optional color for the option. If set, a small color indicator will be
   * shown next to the label in the dropdown.
   */
  color?: Color;
  /** Optional tooltip for an option. If set, a tooltip will be shown when
   * the option is hovered or focused in the dropdown. */
  tooltip?: string | ReactNode;
  /** Optional image source instead of a text label. If used, the label will be
   * used as alt text for the image.
   */
  image?: string;
};
