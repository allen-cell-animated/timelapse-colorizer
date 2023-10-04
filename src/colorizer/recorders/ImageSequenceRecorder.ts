import CanvasRecorder from "./CanvasRecorder";

export default class ImageSequenceRecorder extends CanvasRecorder {
  protected async recordFrame(frame: number): Promise<void> {
    const minDigits = this.options.minDigits || this.options.max.toString().length || 1;

    const canv = this.getCanvas();
    let downloadUrl: string;

    const dataUrl = canv.toDataURL("image/png");
    downloadUrl = dataUrl;
    console.log(downloadUrl);

    const frameSuffix: string = frame.toString().padStart(minDigits, "0");
    const downloadFilename = `${this.options.prefix}${frameSuffix}.png`;
    console.log(downloadUrl);
    this.download(downloadFilename, downloadUrl);
  }
}
