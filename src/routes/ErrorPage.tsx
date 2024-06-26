import { Button } from "antd";
import React, { ReactElement } from "react";
import { ErrorResponse, Link, useRouteError } from "react-router-dom";

import { AnalyticsEvent, triggerAnalyticsEvent } from "../colorizer/utils/analytics";
import { FlexColumnAlignCenter } from "../styles/utils";

import Header from "../components/Header";

const isErrorResponse = (error: unknown): error is ErrorResponse => {
  return typeof (error as ErrorResponse).status === "number" && typeof (error as ErrorResponse).statusText === "string";
};

export default function ErrorPage(): ReactElement {
  const error = useRouteError() as unknown;
  let errorMessage = "";

  if (isErrorResponse(error)) {
    errorMessage = error.status + " " + error.statusText;
    triggerAnalyticsEvent(AnalyticsEvent.ROUTE_ERROR, { errorMessage: error.statusText, errorStatus: error.status });
  } else if (error instanceof Error) {
    errorMessage = error.message;
    triggerAnalyticsEvent(AnalyticsEvent.ROUTE_ERROR, { errorMessage: error.message });
  } else {
    errorMessage = "Unknown error";
    triggerAnalyticsEvent(AnalyticsEvent.ROUTE_ERROR, { errorMessage: "Unknown error" });
  }

  return (
    <div>
      <Header />
      <FlexColumnAlignCenter style={{ width: "100%", padding: "40px 0" }}>
        <h1>Sorry, something went wrong.</h1>
        <FlexColumnAlignCenter>
          <p>We encountered the following error:</p>
          <FlexColumnAlignCenter style={{ margin: "20px 0" }} $gap={10}>
            <h3>{errorMessage}</h3>
            <p>
              <i>Check the browser console for more details.</i>
            </p>
          </FlexColumnAlignCenter>
          <p>
            If the issue persists after a refresh,{" "}
            <Link
              to="https://github.com/allen-cell-animated/timelapse-colorizer/issues/new?template=bug_report.md"
              rel="noopener noreferrer"
              target="_blank"
            >
              please click here to report it.
            </Link>
          </p>
        </FlexColumnAlignCenter>
        <br />
        {/* TODO: Bad practice to wrap a button inside a link, since it's confusing for tab navigation. */}
        <Link to="/">
          <Button type="primary">Return to homepage</Button>
        </Link>
      </FlexColumnAlignCenter>
    </div>
  );
}
