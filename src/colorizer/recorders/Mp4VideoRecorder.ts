import { ArrayBufferTarget, Muxer } from "mp4-muxer";
import Recorder, { RecordingOptions, defaultRecordingOptions } from "../RecordingControls";
import { sleep } from "../utils/timing_utils";

export enum VideoBitrate {
  HIGH = 10e7,
  MEDIUM = 10e6,
  LOW = 5e6,
}

/**
 * Records frames to an MP4 file using the WebCodecs API.
 *
 * Note that the VideoCodecs API is unavailable in some browsers, including Firefox,
 * as of 10/2/2023.
 */
export default class Mp4VideoRecorder extends Recorder {
  private videoEncoder: VideoEncoder;
  private muxer?: Muxer<ArrayBufferTarget>;

  constructor(
    setFrameAndRender: (frame: number) => Promise<void>,
    getCanvas: () => HTMLCanvasElement,
    options: Partial<RecordingOptions>
  ) {
    super(setFrameAndRender, getCanvas);

    this.options = { ...defaultRecordingOptions, ...options };
    this.videoEncoder = new VideoEncoder({
      output: (chunk, meta) => this.muxer?.addVideoChunk(chunk, meta),
      error: (e) => console.error(e),
    });
  }

  protected async setup(): Promise<void> {
    // Check for supported configs!
    // See https://developer.mozilla.org/en-US/docs/Web/API/VideoEncoder/isConfigSupported_static
    // for a detailed example.
    const width = this.options.outputSize[0];
    const height = this.options.outputSize[1];
    const bitrate = this.options.bitrate;
    // first value is browser-recognized codec, second value is muxer codec name
    const codecs: [string, "avc" | "vp9" | "av1"][] = [
      ["avc1.420028", "avc"],
      // ["vp09.00.10.08", "vp9"],  // Disabled because this is not recognized by Windows media players
      ["av01.0.04M.08", "av1"],
    ];
    const accelerations: ("prefer-hardware" | "prefer-software")[] = ["prefer-hardware", "prefer-software"];

    for (const [codec, muxerCodec] of codecs) {
      for (const acceleration of accelerations) {
        const config: VideoEncoderConfig = {
          codec: codec,
          hardwareAcceleration: acceleration,
          width,
          height,
          bitrate,
          bitrateMode: "constant",
          framerate: this.options.fps,
        };
        const { supported, config: supportedConfig } = await VideoEncoder.isConfigSupported(config);
        if (supported && supportedConfig) {
          this.videoEncoder.configure(supportedConfig);
          this.muxer = new Muxer({
            target: new ArrayBufferTarget(),
            video: {
              codec: muxerCodec,
              width: width,
              height: height,
            },
          });
        }
      }
    }

    if (!this.muxer) {
      throw new Error("No valid configuration found for the VideoEncoder.");
    }
  }

  protected async recordFrame(frame: number): Promise<void> {
    const frameIndex = frame - this.options.min;

    // Video compression works by recording changes from one frame to the next. Keyframes
    // have the full frame data saved, so adding them in ensures a smaller drop in frame
    // quality. See https://en.wikipedia.org/wiki/Key_frame for more details.
    const keyFrame = frame % 30 === 0;
    const fps = this.options.fps;
    // 1 second = 1,000,000 microseconds
    const timestampMicroseconds = (frameIndex / fps) * 10e6;
    const durationMicroseconds = 10e6 / fps;

    // Add a slight timer to make sure the canvas is actually done rendering.
    await sleep(10);

    // Delay if needed so video encoder can finish processing.
    // See https://developer.chrome.com/articles/webcodecs/#encoding
    while (this.videoEncoder.encodeQueueSize > 2) {
      await sleep(10);
    }

    if (!this.isRecording()) {
      return;
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
    if (!this.muxer) {
      throw new Error("No muxer found to convert video. Possible bad configuration.");
    }

    this.muxer.finalize();
    const { buffer } = this.muxer.target;

    // Download the finished video file
    const videoBlob = new Blob([buffer], { type: "video/mp4" });
    const url = URL.createObjectURL(videoBlob);
    this.download(this.options.prefix + ".mp4", url);
    URL.revokeObjectURL(url);
  }

  protected cleanup(): void {}

  public static isSupported() {
    return typeof VideoEncoder === "function";
  }
}
