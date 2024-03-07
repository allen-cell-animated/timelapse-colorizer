import { Button } from "antd";
import React, { ReactElement } from "react";
import { Link } from "react-router-dom";

import { Header, HeaderLogo } from "../components/Header";

type LandingPageProps = {};

export default function LandingPage(props: LandingPageProps): ReactElement {
  return (
    <>
      <Header>
        <HeaderLogo />
      </Header>
      <p>Hello </p>
      <Link to="viewer">
        <Button>Go to viewer</Button>
      </Link>
    </>
  );
}
