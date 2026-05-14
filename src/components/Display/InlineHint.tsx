import { InfoCircleOutlined } from "@ant-design/icons";
import React, { type ReactElement, type ReactNode, useRef } from "react";

import { TooltipWithSubtitle } from "src/components/Tooltips/TooltipWithSubtitle";

type InlineHintProps = {
  title?: ReactNode;
  subtitle?: ReactNode;
  subtitleList?: ReactNode[];
};

/** An icon that can be hovered or focused to show an informational tooltip. */
export default function InlineHint(props: InlineHintProps): ReactElement {
  const popupContainerRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={popupContainerRef}>
      <TooltipWithSubtitle
        trigger={["focus", "hover"]}
        title={props.title}
        subtitle={props.subtitle}
        subtitleList={props.subtitleList}
        getPopupContainer={() => popupContainerRef.current ?? document.body}
      >
        <InfoCircleOutlined tabIndex={0}></InfoCircleOutlined>
      </TooltipWithSubtitle>
    </div>
  );
}
