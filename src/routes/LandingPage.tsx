import { Button, Card } from "antd";
import React, { ReactElement, useContext } from "react";
import { Link } from "react-router-dom";

import { FlexColumnAlignCenter, FlexRowAlignCenter } from "../styles/utils";

import { AppThemeContext } from "../components/AppStyle";
import { Header, HeaderLogo } from "../components/Header";

export default function LandingPage(): ReactElement {
  const theme = useContext(AppThemeContext);
  return (
    <>
      <Header>
        <HeaderLogo />
      </Header>
      <br />
      <FlexColumnAlignCenter $gap={10}>
        <Card>
          <h1>Hello! This is the new WIP landing page.</h1>
          <p>
            If you got to this page with a link that previously took you to the viewer, you can continue using it with a
            quick edit.
          </p>
          <br />
          <p>If your link previously looked like this:</p>
          <code>https://dev-aics-dtp-001.int.allencell.org/nucmorph-colorizer/dist/index.html?collection=....</code>
          <p>You&#39;ll need to edit it by adding the new viewer subpath:</p>
          <code>
            https://dev-aics-dtp-001.int.allencell.org/nucmorph-colorizer/dist/index.html
            <b>
              <span style={{ color: "var(--color-text-theme)" }}>/#/viewer</span>
            </b>
            ?collection=....
          </code>
          <br />
          <br />
          <p>
            Make sure to update any links you&#39;ve shared with other people. Thanks for your patience while the tool
            is getting ready for release!
          </p>
        </Card>
        <Link to="viewer">
          <Button type="primary" size="large" style={{ fontSize: theme.font.size.label }}>
            <FlexRowAlignCenter>Go to viewer</FlexRowAlignCenter>
          </Button>
        </Link>
      </FlexColumnAlignCenter>
    </>
  );
}
