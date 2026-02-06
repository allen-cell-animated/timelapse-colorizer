import React, { type ReactElement } from "react";

import { bannerVideo } from "src/assets";

/**
 * Banner video asset which can be loaded lazily.
 */
export default function BannerVideo(): ReactElement {
  return (
    <video autoPlay loop muted>
      <source src={bannerVideo} type="video/mp4" />
    </video>
  );
}
