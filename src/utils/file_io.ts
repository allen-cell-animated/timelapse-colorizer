/**
 * Initiates a browser download of a file using a temporary anchor element.
 * @param filename The default filename to save the file as.
 * @param href The `href` attribute of the download link.
 */
export function download(filename: string, href: string): void {
  // TODO: Add option to show save file picker? https://developer.mozilla.org/en-US/docs/Web/API/Window/showSaveFilePicker
  const anchor = document.createElement("a");
  document.body.appendChild(anchor);

  anchor.href = href;
  anchor.download = filename;
  anchor.click();

  document.body.removeChild(anchor);
}
