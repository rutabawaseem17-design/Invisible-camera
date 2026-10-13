import { useEffect, useRef, useState } from "react";
import {
  FilesetResolver,
  HandLandmarker,
  ImageSegmenter,
} from "@mediapipe/tasks-vision";
import "./App.css";

function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const backgroundCanvasRef = useRef(null);

  const handLandmarkerRef = useRef(null);
  const imageSegmenterRef = useRef(null);
  const animationRef = useRef(null);

  // ==========================================
  // FRAME / SQUARE
  // ==========================================

  const frameRef = useRef({
    x: 400,
    y: 200,
    size: 220,
    active: false,
  });

  // ==========================================
  // INVISIBLE AREA
  // ==========================================

  const invisibleAreaRef = useRef({
    active: false,
    x: 0,
    y: 0,
    size: 0,
  });

  // ==========================================
  // BACKGROUND REF
  // ==========================================

  const backgroundCapturedRef = useRef(false);

  // ==========================================
  // PINCH REFS
  // ==========================================

  const bothPinchingRef = useRef(false);

  const initialHandDistanceRef =
    useRef(null);

  const initialFrameSizeRef =
    useRef(null);

  // ==========================================
  // STATES
  // ==========================================

  const [cameraOn, setCameraOn] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [handDetected, setHandDetected] =
    useState(false);

  const [pinching, setPinching] =
    useState(false);

  const [backgroundCaptured, setBackgroundCaptured] =
    useState(false);

  // ==========================================
  // SETUP AI
  // ==========================================

  const setupAI = async () => {
    try {
      setLoading(true);

      const vision =
        await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm"
        );

      // ========================================
      // HAND LANDMARKER
      // ========================================

      const handLandmarker =
        await HandLandmarker.createFromOptions(
          vision,
          {
            baseOptions: {
              modelAssetPath:
                "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",

              delegate: "GPU",
            },

            runningMode: "VIDEO",

            numHands: 2,

            minHandDetectionConfidence: 0.3,

            minHandPresenceConfidence: 0.3,

            minTrackingConfidence: 0.3,
          }
        );

      handLandmarkerRef.current =
        handLandmarker;

      // ========================================
      // IMAGE SEGMENTER
      // ========================================

      const imageSegmenter =
        await ImageSegmenter.createFromOptions(
          vision,
          {
            baseOptions: {
              modelAssetPath:
                "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/1/selfie_segmenter.tflite",

              delegate: "CPU",
            },

            runningMode: "VIDEO",

            outputCategoryMask: true,

            outputConfidenceMasks: false,
          }
        );

      imageSegmenterRef.current =
        imageSegmenter;

      console.log("✅ AI READY");

      setLoading(false);

      detect();
    } catch (error) {
      console.error(
        "❌ AI SETUP ERROR:",
        error
      );

      setLoading(false);
    }
  };

  // ==========================================
  // START CAMERA
  // ==========================================

  const startCamera = async () => {
    try {
      const stream =
        await navigator.mediaDevices.getUserMedia(
          {
            video: {
              facingMode: "user",

              width: {
                ideal: 1280,
              },

              height: {
                ideal: 720,
              },
            },

            audio: false,
          }
        );

      const video =
        videoRef.current;

      video.srcObject =
        stream;

      await video.play();

      setCameraOn(true);

      await setupAI();
    } catch (error) {
      console.error(
        "❌ CAMERA ERROR:",
        error
      );

      alert(
        "Camera permission is required."
      );
    }
  };

  // ==========================================
  // CAPTURE BACKGROUND
  // ==========================================

  const captureBackground = () => {
    const video =
      videoRef.current;

    const backgroundCanvas =
      backgroundCanvasRef.current;

    if (
      !video ||
      video.readyState < 2
    ) {
      return;
    }

    // Match video dimensions
    backgroundCanvas.width =
      video.videoWidth;

    backgroundCanvas.height =
      video.videoHeight;

    const ctx =
      backgroundCanvas.getContext("2d");

    ctx.clearRect(
      0,
      0,
      backgroundCanvas.width,
      backgroundCanvas.height
    );

    // ========================================
    // MIRROR BACKGROUND
    // ========================================

    ctx.save();

    ctx.translate(
      backgroundCanvas.width,
      0
    );

    ctx.scale(-1, 1);

    ctx.drawImage(
      video,
      0,
      0,
      backgroundCanvas.width,
      backgroundCanvas.height
    );

    ctx.restore();

    // ========================================
    // REMOVE OLD INVISIBLE AREA
    // ========================================

    invisibleAreaRef.current = {
      active: false,
      x: 0,
      y: 0,
      size: 0,
    };

    // ========================================
    // IMPORTANT:
    // USE REF FOR DETECTION LOOP
    // ========================================

    backgroundCapturedRef.current =
      true;

    // State is only for UI
    setBackgroundCaptured(true);

    console.log(
      "📸 BACKGROUND CAPTURED"
    );

    console.log(
      "Background size:",
      backgroundCanvas.width,
      backgroundCanvas.height
    );
  };

  // ==========================================
  // DRAW HAND
  // ==========================================

  const drawHand = (
    ctx,
    hand,
    canvas
  ) => {
    const connections = [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],

      [0, 5],
      [5, 6],
      [6, 7],
      [7, 8],

      [5, 9],
      [9, 10],
      [10, 11],
      [11, 12],

      [9, 13],
      [13, 14],
      [14, 15],
      [15, 16],

      [13, 17],
      [17, 18],
      [18, 19],
      [19, 20],

      [0, 17],
    ];

    ctx.strokeStyle =
      "#ffffff";

    ctx.lineWidth = 3;

    connections.forEach(
      ([start, end]) => {
        const p1 =
          hand[start];

        const p2 =
          hand[end];

        const x1 =
          (1 - p1.x) *
          canvas.width;

        const y1 =
          p1.y *
          canvas.height;

        const x2 =
          (1 - p2.x) *
          canvas.width;

        const y2 =
          p2.y *
          canvas.height;

        ctx.beginPath();

        ctx.moveTo(
          x1,
          y1
        );

        ctx.lineTo(
          x2,
          y2
        );

        ctx.stroke();
      }
    );

    hand.forEach(
      (point) => {
        const x =
          (1 - point.x) *
          canvas.width;

        const y =
          point.y *
          canvas.height;

        ctx.beginPath();

        ctx.arc(
          x,
          y,
          5,
          0,
          Math.PI * 2
        );

        ctx.fillStyle =
          "#ffffff";

        ctx.fill();
      }
    );
  };

  // ==========================================
  // DRAW SQUARE
  // ==========================================

  const drawFrame = (
    ctx,
    frame
  ) => {
    ctx.save();

    ctx.strokeStyle =
      "#ffffff";

    ctx.lineWidth = 6;

    ctx.strokeRect(
      frame.x,
      frame.y,
      frame.size,
      frame.size
    );

    const corner = 30;

    ctx.lineWidth = 10;

    // ========================================
    // TOP LEFT
    // ========================================

    ctx.beginPath();

    ctx.moveTo(
      frame.x,
      frame.y + corner
    );

    ctx.lineTo(
      frame.x,
      frame.y
    );

    ctx.lineTo(
      frame.x + corner,
      frame.y
    );

    ctx.stroke();

    // ========================================
    // TOP RIGHT
    // ========================================

    ctx.beginPath();

    ctx.moveTo(
      frame.x +
        frame.size -
        corner,
      frame.y
    );

    ctx.lineTo(
      frame.x +
        frame.size,
      frame.y
    );

    ctx.lineTo(
      frame.x +
        frame.size,
      frame.y + corner
    );

    ctx.stroke();

    // ========================================
    // BOTTOM LEFT
    // ========================================

    ctx.beginPath();

    ctx.moveTo(
      frame.x,
      frame.y +
        frame.size -
        corner
    );

    ctx.lineTo(
      frame.x,
      frame.y +
        frame.size
    );

    ctx.lineTo(
      frame.x + corner,
      frame.y +
        frame.size
    );

    ctx.stroke();

    // ========================================
    // BOTTOM RIGHT
    // ========================================

    ctx.beginPath();

    ctx.moveTo(
      frame.x +
        frame.size -
        corner,
      frame.y +
        frame.size
    );

    ctx.lineTo(
      frame.x +
        frame.size,
      frame.y +
        frame.size
    );

    ctx.lineTo(
      frame.x +
        frame.size,
      frame.y +
        frame.size -
        corner
    );

    ctx.stroke();

    ctx.restore();
  };

  // ==========================================
  // MAKE PERSON INVISIBLE
  // ==========================================
  //
  // TEMPORARY TEST:
  //
  // Replace the entire selected square
  // with the captured background.
  //
  // This proves that the background
  // replacement system works before
  // we bring segmentation back.
  //
  // ==========================================

  const makePersonInvisible = () => {
    if (
      !backgroundCapturedRef.current ||
      !invisibleAreaRef.current.active
    ) {
      return;
    }

    const canvas =
      canvasRef.current;

    const bgCanvas =
      backgroundCanvasRef.current;

    if (
      !canvas ||
      !bgCanvas
    ) {
      return;
    }

    const ctx =
      canvas.getContext("2d");

    const bgCtx =
      bgCanvas.getContext("2d");

    const current =
      ctx.getImageData(
        0,
        0,
        canvas.width,
        canvas.height
      );

    const background =
      bgCtx.getImageData(
        0,
        0,
        bgCanvas.width,
        bgCanvas.height
      );

    const {
      x,
      y,
      size,
    } =
      invisibleAreaRef.current;

    // ========================================
    // SQUARE BOUNDS
    // ========================================

    const left =
      Math.max(
        0,
        Math.floor(x)
      );

    const top =
      Math.max(
        0,
        Math.floor(y)
      );

    const right =
      Math.min(
        canvas.width,
        Math.floor(
          x + size
        )
      );

    const bottom =
      Math.min(
        canvas.height,
        Math.floor(
          y + size
        )
      );

    // ========================================
    // COPY BACKGROUND
    // ========================================

    for (
      let py = top;
      py < bottom;
      py++
    ) {
      for (
        let px = left;
        px < right;
        px++
      ) {
        const index =
          (py *
            canvas.width +
            px) *
          4;

        current.data[index] =
          background.data[index];

        current.data[index + 1] =
          background.data[
            index + 1
          ];

        current.data[index + 2] =
          background.data[
            index + 2
          ];

        current.data[index + 3] =
          255;
      }
    }

    ctx.putImageData(
      current,
      0,
      0
    );

    // Only log occasionally
    if (
      Math.random() < 0.02
    ) {
      console.log(
        "🫥 INVISIBLE AREA APPLIED"
      );
    }
  };

  // ==========================================
  // MAIN DETECTION LOOP
  // ==========================================

  const detect = () => {
    const video =
      videoRef.current;

    const canvas =
      canvasRef.current;

    const handLandmarker =
      handLandmarkerRef.current;

    const imageSegmenter =
      imageSegmenterRef.current;

    if (
      !video ||
      !canvas ||
      !handLandmarker ||
      !imageSegmenter
    ) {
      animationRef.current =
        requestAnimationFrame(
          detect
        );

      return;
    }

    if (
      video.readyState >= 2
    ) {
      // ======================================
      // CANVAS SIZE
      // ======================================

      if (
        canvas.width !==
        video.videoWidth
      ) {
        canvas.width =
          video.videoWidth;
      }

      if (
        canvas.height !==
        video.videoHeight
      ) {
        canvas.height =
          video.videoHeight;
      }

      const ctx =
        canvas.getContext("2d");

      // ======================================
      // DRAW CAMERA
      // ======================================

      ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
      );

      ctx.save();

      ctx.translate(
        canvas.width,
        0
      );

      ctx.scale(
        -1,
        1
      );

      ctx.drawImage(
        video,
        0,
        0,
        canvas.width,
        canvas.height
      );

      ctx.restore();

      const timestamp =
        performance.now();

      // ======================================
      // SEGMENTATION
      // ======================================
      //
      // Still running so we can add the
      // person-only mask after the basic
      // background replacement works.
      //
      // ======================================

      try {
        imageSegmenter.segmentForVideo(
          video,
          timestamp
        );
      } catch (error) {
        console.error(
          "❌ SEGMENTATION ERROR:",
          error
        );
      }

      // ======================================
      // HAND DETECTION
      // ======================================

      let results;

      try {
        results =
          handLandmarker.detectForVideo(
            video,
            timestamp
          );
      } catch (error) {
        console.error(
          "❌ HAND DETECTION ERROR:",
          error
        );

        animationRef.current =
          requestAnimationFrame(
            detect
          );

        return;
      }

      const hands =
        results.landmarks;

      // ======================================
      // TWO HANDS
      // ======================================

      if (
        hands &&
        hands.length >= 2
      ) {
        setHandDetected(true);

        // Draw hands
        hands.forEach(
          (hand) => {
            drawHand(
              ctx,
              hand,
              canvas
            );
          }
        );

        const hand1 =
          hands[0];

        const hand2 =
          hands[1];

        const thumb1 =
          hand1[4];

        const index1 =
          hand1[8];

        const thumb2 =
          hand2[4];

        const index2 =
          hand2[8];

        // ======================================
        // MIRRORED POSITIONS
        // ======================================

        const thumb1X =
          (1 - thumb1.x) *
          canvas.width;

        const thumb1Y =
          thumb1.y *
          canvas.height;

        const index1X =
          (1 - index1.x) *
          canvas.width;

        const index1Y =
          index1.y *
          canvas.height;

        const thumb2X =
          (1 - thumb2.x) *
          canvas.width;

        const thumb2Y =
          thumb2.y *
          canvas.height;

        const index2X =
          (1 - index2.x) *
          canvas.width;

        const index2Y =
          index2.y *
          canvas.height;

        // ======================================
        // PINCH DISTANCE
        // ======================================

        const pinchDistance1 =
          Math.hypot(
            thumb1X -
              index1X,
            thumb1Y -
              index1Y
          );

        const pinchDistance2 =
          Math.hypot(
            thumb2X -
              index2X,
            thumb2Y -
              index2Y
          );

        const pinchThreshold =
          120;

        const hand1Pinching =
          pinchDistance1 <
          pinchThreshold;

        const hand2Pinching =
          pinchDistance2 <
          pinchThreshold;

        const bothPinching =
          hand1Pinching &&
          hand2Pinching;

        setPinching(
          bothPinching
        );

        // ======================================
        // PINCH POINTS
        // ======================================

        const pinch1X =
          (thumb1X +
            index1X) /
          2;

        const pinch1Y =
          (thumb1Y +
            index1Y) /
          2;

        const pinch2X =
          (thumb2X +
            index2X) /
          2;

        const pinch2Y =
          (thumb2Y +
            index2Y) /
          2;

        // ======================================
        // CENTER
        // ======================================

        const centerX =
          (pinch1X +
            pinch2X) /
          2;

        const centerY =
          (pinch1Y +
            pinch2Y) /
          2;

        // ======================================
        // HAND DISTANCE
        // ======================================

        const handDistance =
          Math.hypot(
            pinch1X -
              pinch2X,
            pinch1Y -
              pinch2Y
          );

        // ======================================
        // START PINCH
        // ======================================

        if (
          bothPinching &&
          !bothPinchingRef.current
        ) {
          bothPinchingRef.current =
            true;

          // Clear previous invisibility
          invisibleAreaRef.current = {
            active: false,
            x: 0,
            y: 0,
            size: 0,
          };

          const frame =
            frameRef.current;

          frame.active =
            true;

          frame.size =
            Math.max(
              150,
              Math.min(
                500,
                handDistance
              )
            );

          frame.x =
            centerX -
            frame.size / 2;

          frame.y =
            centerY -
            frame.size / 2;

          initialHandDistanceRef.current =
            handDistance;

          initialFrameSizeRef.current =
            frame.size;

          console.log(
            "🤏 BOTH HANDS PINCHING"
          );
        }

        // ======================================
        // CONTROL SQUARE
        // ======================================

        if (
          bothPinching &&
          bothPinchingRef.current
        ) {
          const frame =
            frameRef.current;

          frame.active =
            true;

          const sizeRatio =
            handDistance /
            initialHandDistanceRef.current;

          const newSize =
            initialFrameSizeRef.current *
            sizeRatio;

          frame.size =
            Math.max(
              120,
              Math.min(
                700,
                newSize
              )
            );

          frame.x =
            centerX -
            frame.size / 2;

          frame.y =
            centerY -
            frame.size / 2;

          // Draw square
          drawFrame(
            ctx,
            frame
          );

          // ====================================
          // PINCH POINT 1
          // ====================================

          ctx.beginPath();

          ctx.arc(
            pinch1X,
            pinch1Y,
            15,
            0,
            Math.PI * 2
          );

          ctx.strokeStyle =
            "#ffffff";

          ctx.lineWidth = 5;

          ctx.stroke();

          // ====================================
          // PINCH POINT 2
          // ====================================

          ctx.beginPath();

          ctx.arc(
            pinch2X,
            pinch2Y,
            15,
            0,
            Math.PI * 2
          );

          ctx.strokeStyle =
            "#ffffff";

          ctx.lineWidth = 5;

          ctx.stroke();
        }

        // ======================================
        // RELEASE
        // ======================================

        if (
          !bothPinching &&
          bothPinchingRef.current
        ) {
          bothPinchingRef.current =
            false;

          const frame =
            frameRef.current;

          // Save final square
          invisibleAreaRef.current = {
            active: true,
            x: frame.x,
            y: frame.y,
            size: frame.size,
          };

          // Hide square
          frame.active =
            false;

          initialHandDistanceRef.current =
            null;

          initialFrameSizeRef.current =
            null;

          console.log(
            "🫥 INVISIBILITY ON"
          );

          console.log(
            "Invisible area:",
            invisibleAreaRef.current
          );
        }
      } else {
        setHandDetected(
          hands &&
          hands.length > 0
        );

        setPinching(false);

        // ======================================
        // HANDS DISAPPEARED DURING PINCH
        // ======================================

        if (
          bothPinchingRef.current
        ) {
          bothPinchingRef.current =
            false;

          const frame =
            frameRef.current;

          invisibleAreaRef.current = {
            active: true,
            x: frame.x,
            y: frame.y,
            size: frame.size,
          };

          frame.active =
            false;

          initialHandDistanceRef.current =
            null;

          initialFrameSizeRef.current =
            null;

          console.log(
            "🫥 INVISIBILITY ON"
          );
        }
      }

      // ======================================
      // APPLY INVISIBILITY
      // ======================================

      if (
        invisibleAreaRef.current.active &&
        backgroundCapturedRef.current
      ) {
        makePersonInvisible();
      }

      // ======================================
      // DRAW FRAME LAST
      // ======================================

      if (
        frameRef.current.active
      ) {
        drawFrame(
          ctx,
          frameRef.current
        );
      }
    }

    animationRef.current =
      requestAnimationFrame(
        detect
      );
  };

  // ==========================================
  // CLEANUP
  // ==========================================

  useEffect(() => {
    return () => {
      if (
        animationRef.current
      ) {
        cancelAnimationFrame(
          animationRef.current
        );
      }

      if (
        handLandmarkerRef.current
      ) {
        handLandmarkerRef.current.close();
      }

      if (
        imageSegmenterRef.current
      ) {
        imageSegmenterRef.current.close();
      }

      const video =
        videoRef.current;

      if (
        video &&
        video.srcObject
      ) {
        video.srcObject
          .getTracks()
          .forEach(
            (track) => {
              track.stop();
            }
          );
      }
    };
  }, []);

  // ==========================================
  // UI
  // ==========================================

  return (
    <div className="app">

      <h1>InvisiCam</h1>

      <p className="subtitle">
        See yourself disappear.
      </p>

      <div className="camera-container">

        <video
          ref={videoRef}
          className="camera"
          playsInline
          muted
        />

        <canvas
          ref={canvasRef}
          className="hand-canvas"
        />

        <canvas
          ref={backgroundCanvasRef}
          style={{
            display: "none",
          }}
        />

      </div>

      <div className="status">

        {loading
          ? "⏳ Loading AI..."

          : pinching
          ? "🤏🤏 Control the space"

          : handDetected
          ? backgroundCaptured
            ? "🤏 Pinch with BOTH hands"
            : "📸 Capture background first"

          : "👋 Show both hands"}

      </div>

      <div className="controls">

        {!cameraOn && (
          <button
            onClick={
              startCamera
            }
          >
            📷 Start Camera
          </button>
        )}

        {cameraOn && (
          <button
            onClick={
              captureBackground
            }
          >
            📸{" "}
            {backgroundCaptured
              ? "Recapture Background"
              : "Capture Background"}
          </button>
        )}

      </div>

    </div>
  );
}

export default App;