import { Button } from "antd";
import React, { ReactElement } from "react";
import { ErrorResponse, Link, useRouteError } from "react-router-dom";

import { FlexColumnAlignCenter } from "../styles/utils";

import { Header, HeaderLogo } from "../components/Header";

const isErrorResponse = (error: unknown): error is ErrorResponse => {
  return typeof (error as ErrorResponse).status === "number" && typeof (error as ErrorResponse).statusText === "string";
};

export default function ErrorPage(): ReactElement {
  const error = useRouteError() as unknown;
  let errorMessage = "";

  if (isErrorResponse(error)) {
    errorMessage = error.status + " " + error.statusText;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  } else {
    errorMessage = "Unknown error";
  }

  return (
    <div>
      <Header>
        <HeaderLogo />
      </Header>
      <FlexColumnAlignCenter style={{ width: "100%", padding: "40px" }}>
        <h1>{errorMessage}</h1>
        <p>Sorry, something went wrong.</p>
        <br />
        <Link to="/">
          <Button type="primary">Return to homepage</Button>
        </Link>
      </FlexColumnAlignCenter>
    </div>
  );
}
