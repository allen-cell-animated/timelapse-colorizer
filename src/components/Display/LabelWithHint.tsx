import React, { PropsWithChildren, ReactElement } from "react";

import InlineHint, { InlineHintProps } from "src/components/Display/InlineHint";
import { FlexRowAlignCenter } from "src/styles/utils";

type LabelWithHintProps = {
  hintProps: InlineHintProps;
};

/** Convenience component, combines a text label with an inline hint. */
export default function LabelWithHint(props: PropsWithChildren<LabelWithHintProps>): ReactElement {
  return (
    <FlexRowAlignCenter $gap={4}>
      {props.children} <InlineHint {...props.hintProps} />
    </FlexRowAlignCenter>
  );
}
