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

export function downloadCsv(filename: string, csvContent: string): void {
  // Must add a byte order mark (BOM) to the beginning of the CSV content
  // in order for UTF-8 characters to be displayed properly in Excel (ex: μ).
  // Adapted from https://stackoverflow.com/a/56154648.
  const buffer = new ArrayBuffer(3);
  const dataView = new DataView(buffer);
  dataView.setUint8(0, 0xef);
  dataView.setUint8(1, 0xbb);
  dataView.setUint8(2, 0xbf);
  const bomPrefix = new Uint8Array(buffer);

  const blob = new Blob([bomPrefix, csvContent], { type: "text/csv;charset=utf-8" });
  const blobUrl = URL.createObjectURL(blob);
  download(filename, blobUrl);
  URL.revokeObjectURL(blobUrl);
}
