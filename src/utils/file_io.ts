/**
 * Initiates a browser download of a file from a URL.
 * @param filename The default filename to save the file as.
 * @param url The `href` attribute of the download link. This can either be a data
 * URL or
 */
export function download(filename: string, url: string): void {
  // TODO: Add option to show save file picker? https://developer.mozilla.org/en-US/docs/Web/API/Window/showSaveFilePicker
  const anchor = document.createElement("a");
  document.body.appendChild(anchor);

  anchor.href = url;
  anchor.download = filename;
  anchor.click();

  document.body.removeChild(anchor);
}
