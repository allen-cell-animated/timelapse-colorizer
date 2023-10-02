import { ArrayBufferTarget, Muxer } from "mp4-muxer";
import Recorder, { RecordingOptions, defaultRecordingOptions } from "../RecordingControls";
import { sleep } from "../utils/timing_utils";

/**
 * Records frames to an MP4 file using the WebCodecs API.
 *
 * Note that the VideoCodecs API is unavailable in some browsers, including Firefox,
 * as of 10/2/2023.
 */
export default class WebCodecsMp4Recorder extends Recorder {
  private videoEncoder: VideoEncoder;
  private muxer: Muxer<ArrayBufferTarget>;

  constructor(
    setFrameAndRender: (frame: number) => Promise<void>,
    getCanvas: () => HTMLCanvasElement,
    options: Partial<RecordingOptions>
  ) {
    super(setFrameAndRender, getCanvas);

    this.options = { ...defaultRecordingOptions, ...options };

    this.videoEncoder = new VideoEncoder({
      output: (chunk, meta) => this.muxer.addVideoChunk(chunk, meta),
      error: (e) => console.error(e),
    });

    const width = this.options.outputSize[0];
    const height = this.options.outputSize[1];
    const bitrate = 10e7;
    const codec = "avc1.420028";
    const codecs = ["avc1.420028", "vp8", "vp09.00.10.08", "av01.0.04M.08"];
    const accelerations = ["prefer-hardware", "prefer-software"];

    // TODO: Check for supported configs!
    // See https://developer.mozilla.org/en-US/docs/Web/API/VideoEncoder/isConfigSupported_static
    // for a detailed example.

    this.videoEncoder.configure({
      codec: "avc1.420028",
      width,
      height,
      bitrate,
      bitrateMode: "constant",
    });

    this.muxer = new Muxer({
      target: new ArrayBufferTarget(),
      video: {
        codec: "avc",
        width: width,
        height: height,
      },
    });
  }

  protected async recordFrame(frame: number): Promise<void> {
    const frameIndex = frame - this.options.min;

    // Video compression works by recording changes from one frame to the next. Keyframes
    // have the full frame data saved, so adding them in ensures a smaller drop in frame
    // quality. See https://en.wikipedia.org/wiki/Key_frame for more details.
    const keyFrame = true;
    const fps = 30;
    // 1 second = 1,000,000 microseconds
    const timestampMicroseconds = (frameIndex / fps) * 10e6;
    const durationMicroseconds = 10e6 / fps;
    console.log(
      `Frame ${frame} - Index ${frameIndex} - Timestamp ${timestampMicroseconds} - Duration ${durationMicroseconds}`
    );
    // Add a slight timer to make sure the canvas is actually done rendering.
    await sleep(10);

    // Delay if needed so video encoder can finish processing.
    // See https://developer.chrome.com/articles/webcodecs/#encoding
    while (this.videoEncoder.encodeQueueSize > 2) {
      await sleep(10);
    }

    // Add the frame to the video encoder
    const videoFrame = new VideoFrame(this.getCanvas(), {
      // Fixes weird quirk where duration/timestamps are off by a magnitude of 10
      duration: durationMicroseconds / 10,
      timestamp: timestampMicroseconds / 10,
    });
    this.videoEncoder.encode(videoFrame, {
      keyFrame,
    });
    videoFrame.close();
  }

  protected async onCompletedRecording(): Promise<void> {
    await this.videoEncoder.flush();
    this.muxer.finalize();
    const { buffer } = this.muxer.target;

    // Download the finished video file
    const videoBlob = new Blob([buffer], { type: "video/mp4" });
    const url = URL.createObjectURL(videoBlob);
    this.download(this.options.prefix + ".mp4", url);
    URL.revokeObjectURL(url);
  }

  protected cleanup(): void {
    this.videoEncoder.reset();
  }

  public static isSupported() {
    return typeof VideoEncoder === "function";
  }
}
