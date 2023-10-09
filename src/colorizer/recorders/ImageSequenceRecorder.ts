import CanvasRecorder from "./CanvasRecorder";

/**
 * Downloads each frame as a PNG image.
 */
export default class ImageSequenceRecorder extends CanvasRecorder {
  protected async recordFrame(frame: number): Promise<void> {
    const minDigits = this.options.minDigits || this.options.max.toString().length || 1;

    await this.setFrameAndRender(frame);
    const canv = this.getCanvas();
    let downloadUrl: string;

    const dataUrl = canv.toDataURL("image/png");
    downloadUrl = dataUrl;

    const frameSuffix: string = frame.toString().padStart(minDigits, "0");
    const downloadFilename = `${this.options.prefix}${frameSuffix}.png`;
    this.download(downloadFilename, downloadUrl);
  }
}
