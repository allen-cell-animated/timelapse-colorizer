import { Button } from "antd";
import React, { ReactElement } from "react";
import { ErrorResponse, Link, useRouteError } from "react-router-dom";

import { FlexColumnAlignCenter } from "../styles/utils";

const isErrorResponse = (error: unknown): error is ErrorResponse => {
  return (error as Object).hasOwnProperty("status") && (error as Object).hasOwnProperty("statusText");
};

export default function ErrorPage(): ReactElement {
  const error = useRouteError() as unknown;
  let errorMessage = "";
  if (isErrorResponse(error)) {
    errorMessage = error.status + " " + error.statusText;
  }

  return (
    <FlexColumnAlignCenter style={{ width: "100%", padding: "20px" }}>
      <h1>{errorMessage}</h1>
      <p>Sorry, an unexpected error has occurred.</p>
      <Link to="/">
        <Button type="primary">Return to homepage</Button>
      </Link>
    </FlexColumnAlignCenter>
  );
}
