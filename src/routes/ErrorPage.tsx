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
  } else if (error instanceof Error) {
    errorMessage = error.message;
  } else {
    errorMessage = "Unknown error";
  }

  return (
    <FlexColumnAlignCenter style={{ width: "100%", padding: "40px" }}>
      <h1>{errorMessage}</h1>
      <p>Sorry, something went wrong.</p>
      <br />
      <Link to="/">
        <Button type="primary">Return to homepage</Button>
      </Link>
    </FlexColumnAlignCenter>
  );
}
