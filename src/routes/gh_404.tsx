import { encodeGitHubPagesUrl } from "src/utils/gh_routing";

// This script is used in the 404.html page to redirect the browser to the correct URL.
// Convert the current URL to a query string path and redirect the browser.
const location = window.location;
const locationUrl = new URL(location.toString());
const newUrl = encodeGitHubPagesUrl(locationUrl);

if (newUrl.toString() !== locationUrl.toString()) {
  // Hide the default 404 page content and just show a blank screen if
  // redirecting.
  document.body.innerHTML = "";

  location.replace(newUrl);
  console.log("Redirecting to " + newUrl.toString());
}
