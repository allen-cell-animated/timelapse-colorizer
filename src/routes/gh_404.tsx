import { encodeGitHubPagesUrl } from "../utils/gh_routing";

// Hide the default 404 page content and just show a blank screen.
// The content should only be shown if the browser doesn't support JavaScript.
window.onload = () => {
  document.body.innerHTML = "";
};

// This script is used in the 404.html page to redirect the browser to the correct URL.
// Convert the current URL to a query string path and redirect the browser.
const location = window.location;
const locationUrl = new URL(location.toString());
const newUrl = encodeGitHubPagesUrl(locationUrl);
location.replace(newUrl);
console.log("Redirecting to " + newUrl.toString());
