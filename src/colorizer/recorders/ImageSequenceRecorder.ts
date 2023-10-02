import Recorder from "../RecordingControls";

export default class ImageSequenceRecorder extends Recorder {
  protected async recordFrame(frame: number): Promise<void> {
    const minDigits = this.options.minDigits || this.options.max.toString().length || 1;

    const canv = this.getCanvas();
    let downloadUrl: string;
    if (canv instanceof OffscreenCanvas) {
      downloadUrl = URL.createObjectURL(await canv.convertToBlob());
    } else {
      console.log("Working with HTMLCanvas...");
      console.log(canv);
      const dataUrl = canv.toDataURL("image/png");
      downloadUrl = dataUrl.replace(/^data:image\/png/, "data:application/octet-stream");
    }

    const frameSuffix: string = frame.toString().padStart(minDigits, "0");
    const downloadFilename = `${this.options.prefix}${frameSuffix}.png`;
    console.log(downloadUrl);
    this.download(downloadFilename, downloadUrl);
  }
}
