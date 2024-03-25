import { CloseCircleFilled } from "@ant-design/icons";
import { Button, Checkbox, Modal } from "antd";
import React, { ReactElement, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Color } from "three";

import { ColorizeCanvas, ColorRamp, Dataset, Track } from "../colorizer";
import { ViewerConfig } from "../colorizer/types";
import { FlexColumn, FlexRowAlignCenter } from "../styles/utils";

import { AppThemeContext, DocumentContext } from "./AppStyle";

const CANVAS_BORDER_OFFSET_PX = 4;

type CanvasWrapperProps = {
  canv: ColorizeCanvas;
  /** Dataset to look up track and ID information in.
   * Changing this does NOT update the canvas dataset; do so
   * directly by calling `canv.setDataset()`.
   */
  dataset: Dataset | null;
  config: ViewerConfig;

  selectedBackdropKey: string | null;

  colorRamp: ColorRamp;
  colorRampMin: number;
  colorRampMax: number;

  selectedTrack: Track | null;
  categoricalColors: Color[];

  inRangeLUT?: Uint8Array;

  /** Called when the mouse hovers over the canvas; reports the currently hovered id. */
  onMouseHover?: (id: number) => void;
  /** Called when the mouse exits the canvas. */
  onMouseLeave?: () => void;
  /** Called when the canvas is clicked; reports the track info of the clicked object. */
  onTrackClicked?: (track: Track | null) => void;

  stopPlayback?: () => void;

  maxWidth?: number;
  maxHeight?: number;
};

const defaultProps: Partial<CanvasWrapperProps> = {
  stopPlayback: () => {},
  onMouseHover: () => {},
  onMouseLeave: () => {},
  onTrackClicked: () => {},
  inRangeLUT: new Uint8Array(0),
  maxWidth: 730,
  maxHeight: 500,
};

/**
 * Provides a React component-style interface for interacting with ColorizeCanvas.
 *
 * Note that some canvas operations (like `setFrame`, `setFeature`, `setDataset`)
 * are async and should be called directly on the canvas instance.
 */
export default function CanvasWrapper(inputProps: CanvasWrapperProps): ReactElement {
  const props = { ...defaultProps, ...inputProps } as Required<CanvasWrapperProps>;

  const [allowLoadErrorModal, setAllowLoadErrorModal] = useState(true);

  const [hasShownLoadError, setHasShownLoadError] = useState(false);
  const [showLoadError, setShowLoadError] = useState(false);
  const [loadErrorMessage, setLoadErrorMessage] = useState("");

  const { modalContainerRef } = useContext(DocumentContext);

  const canv = props.canv;
  const canvasRef = useRef<HTMLDivElement>(null);
  const isMouseOverCanvas = useRef(false);
  const lastMousePositionPx = useRef([0, 0]);
  const theme = useContext(AppThemeContext);

  // ERROR HANDLING /////////////////////////////////////////////////

  const onLoadError = useCallback(
    (message: string): void => {
      if (allowLoadErrorModal && !hasShownLoadError) {
        setLoadErrorMessage(message);
        setShowLoadError(true);
        setHasShownLoadError(true);
        props.stopPlayback();
      }
    },
    [allowLoadErrorModal, modalContainerRef]
  );

  useEffect(() => {
    canv.setOnLoadError(onLoadError);
  }, [onLoadError]);

  useEffect(() => {
    // Reset error message state when the dataset changes
    setHasShownLoadError(false);
  }, [props.dataset]);

  // CANVAS PROPERTIES /////////////////////////////////////////////////

  // Mount the canvas to the wrapper's location in the document.
  useEffect(() => {
    canvasRef.current?.parentNode?.replaceChild(canv.domElement, canvasRef.current);
  }, []);

  // These are all useMemo calls because the updates to the canvas must happen in the same render;
  // if these were useEffects, the canvas will lag behind updates since there is no state update to
  // trigger a re-render.

  // Update the theming of the canvas overlay.
  useMemo(() => {
    const defaultTheme = {
      fontSizePx: theme.font.size.label,
      fontColor: theme.color.text.primary,
      fontFamily: theme.font.family,
    };
    canv.overlay.updateScaleBarOptions(defaultTheme);
    canv.overlay.updateTimestampOptions(defaultTheme);
    canv.overlay.updateBackgroundOptions({ stroke: theme.color.layout.borders });
  }, [theme]);

  // Update canvas color ramp
  useMemo(() => {
    canv.setColorRamp(props.colorRamp);
    canv.setColorMapRangeMin(props.colorRampMin);
    canv.setColorMapRangeMax(props.colorRampMax);
  }, [props.colorRamp, props.colorRampMin, props.colorRampMax]);

  // Update backdrops
  useMemo(() => {
    canv.setBackdropKey(props.selectedBackdropKey);
    canv.setBackdropBrightness(props.config.backdropBrightness);
    canv.setBackdropSaturation(props.config.backdropSaturation);
  }, [props.selectedBackdropKey, props.config.backdropBrightness, props.config.backdropSaturation]);

  // Update categorical colors
  useMemo(() => {
    canv.setCategoricalColors(props.categoricalColors);
  }, [props.categoricalColors]);

  // Update drawing modes for outliers + out of range values
  useMemo(() => {
    const settings = props.config.outOfRangeDrawSettings;
    canv.setOutOfRangeDrawMode(settings.mode, settings.color);
  }, [props.config.outOfRangeDrawSettings]);

  useMemo(() => {
    const settings = props.config.outlierDrawSettings;
    canv.setOutlierDrawMode(settings.mode, settings.color);
  }, [props.config.outlierDrawSettings]);

  useMemo(() => {
    canv.setObjectOpacity(props.config.objectOpacity);
  }, [props.config.objectOpacity]);

  useMemo(() => {
    canv.setInRangeLUT(props.inRangeLUT);
  }, [props.inRangeLUT]);

  // Updated track-related settings
  useMemo(() => {
    canv.setSelectedTrack(props.selectedTrack);
    canv.setShowTrackPath(props.config.showTrackPath);
  }, [props.selectedTrack, props.config.showTrackPath]);

  // Update overlay settings
  useMemo(() => {
    canv.setScaleBarVisibility(props.config.showScaleBar);
  }, [props.config.showScaleBar]);

  useMemo(() => {
    canv.setTimestampVisibility(props.config.showTimestamp);
  }, [props.config.showTimestamp]);

  // CANVAS ACTIONS /////////////////////////////////////////////////

  /** Report clicked tracks via the passed callback. */
  const handleCanvasClick = useCallback(
    async (event: MouseEvent): Promise<void> => {
      const id = canv.getIdAtPixel(event.offsetX, event.offsetY);
      // Reset track input
      if (id < 0 || props.dataset === null) {
        props.onTrackClicked(null);
      } else {
        const trackId = props.dataset.getTrackId(id);
        const newTrack = props.dataset.buildTrack(trackId);
        props.onTrackClicked(newTrack);
      }
    },
    [props.dataset]
  );

  useEffect(() => {
    canv.domElement.addEventListener("click", handleCanvasClick);
    return () => {
      canv.domElement.removeEventListener("click", handleCanvasClick);
    };
  }, [handleCanvasClick]);

  /** Report hovered id via the passed callback. */
  const reportHoveredIdAtPixel = useCallback(
    (x: number, y: number): void => {
      if (!props.dataset) {
        return;
      }
      const id = canv.getIdAtPixel(x, y);
      props.onMouseHover(id);
    },
    [props.dataset, canv]
  );

  /** Track whether the canvas is hovered, so we can determine whether to send updates about the
   * hovered value wwhen the canvas frame updates.
   */
  useEffect(() => {
    canv.domElement.addEventListener("mouseenter", () => (isMouseOverCanvas.current = true));
    canv.domElement.addEventListener("mouseleave", () => (isMouseOverCanvas.current = false));
  });

  /** Update hovered id when the canvas updates the current frame */
  useEffect(() => {
    if (isMouseOverCanvas.current) {
      reportHoveredIdAtPixel(lastMousePositionPx.current[0], lastMousePositionPx.current[1]);
    }
  }, [canv.getCurrentFrame()]);

  useEffect(() => {
    const onMouseMove = (event: MouseEvent): void => {
      reportHoveredIdAtPixel(event.offsetX, event.offsetY);
      lastMousePositionPx.current = [event.offsetX, event.offsetY];
    };

    canv.domElement.addEventListener("mousemove", onMouseMove);
    canv.domElement.addEventListener("mouseleave", props.onMouseLeave);
    return () => {
      canv.domElement.removeEventListener("mousemove", onMouseMove);
      canv.domElement.removeEventListener("mouseleave", props.onMouseLeave);
    };
  }, [props.dataset, canv]);

  // Respond to window resizing
  useEffect(() => {
    /**
     * Update the canvas dimensions based on the current window size.
     * TODO: Margin calculation?
     */
    const setSize = (): void => {
      const width = Math.min(window.innerWidth - 75 - CANVAS_BORDER_OFFSET_PX, props.maxWidth);
      const height = Math.min(window.innerHeight - 75 - CANVAS_BORDER_OFFSET_PX, props.maxHeight);
      canv.setSize(width, height);
    };
    const handleResize = (): void => {
      setSize();
      canv.render();
    };

    setSize(); // Initial size setting
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [canv]);

  // RENDERING /////////////////////////////////////////////////

  const errorStyle = { color: "var(--color-text-error)" };

  const modalTitle = (
    <FlexRowAlignCenter $gap={6}>
      <h3>
        <span style={errorStyle}>
          <CloseCircleFilled />
        </span>
      </h3>
      <h3>
        <b>File load error</b>
      </h3>
    </FlexRowAlignCenter>
  );

  canv.render();
  return (
    <>
      <div ref={canvasRef}></div>
      <Modal
        title={modalTitle}
        open={showLoadError}
        getContainer={modalContainerRef || undefined}
        onCancel={() => setShowLoadError(false)}
        footer={
          <Button onClick={() => setShowLoadError(false)} type="primary">
            OK
          </Button>
        }
      >
        <FlexColumn $gap={12}>
          <p>An error occurred when trying to load dataset assets. Missing data will be shown as a blank screen.</p>
          <p style={errorStyle}>Error message: {loadErrorMessage}</p>
          <p>
            For troubleshooting, <b>check that you are connected to the network</b> and have access to the dataset path,
            and <b>check the browser console</b> for more details. Otherwise, please contact the dataset creator as the
            dataset may be missing files.
          </p>
          <p>
            <i>Note that this message will only be shown once per dataset; other files may also be missing.</i>
          </p>
          <FlexColumn>
            <Checkbox
              type="checkbox"
              checked={!allowLoadErrorModal}
              onChange={() => {
                setAllowLoadErrorModal(!allowLoadErrorModal);
              }}
            >
              Don&apos;t show again this session
            </Checkbox>
          </FlexColumn>
        </FlexColumn>
      </Modal>
    </>
  );
}
