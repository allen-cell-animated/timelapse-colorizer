import React, { ReactElement } from "react";

import { bannerVideo } from "../../assets";

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
