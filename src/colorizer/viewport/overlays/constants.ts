import { Vector2 } from "three";

import type { ContainerStyle, FontStyle, RenderInfo } from "src/colorizer/viewport/overlays/types";

export const EMPTY_RENDER_INFO: RenderInfo = { sizePx: new Vector2(0, 0), render: () => {} };

export const defaultFontStyle: FontStyle = {
  fontColor: "black",
  fontSizePx: 14,
  fontFamily: "Lato",
  fontWeight: "400",
};

export const defaultContainerStyle: ContainerStyle = {
  marginPx: new Vector2(0, 0),
  paddingPx: new Vector2(0, 0),
  fill: "rgba(255, 255, 255, 1.0)",
  stroke: "rgba(203, 203, 204, 1.0)",
};
