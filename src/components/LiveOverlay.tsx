import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Mic, Video, VideoOff, Loader2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { API_BASE_URL } from "@/config/api";

interface LiveOverlayProps {
  userId?: string;
}

export const LiveOverlay = ({ userId = "user-1" }: LiveOverlayProps) => {
  const [isActive, setIsActive] = useState(false);
  const [overlayText, setOverlayText] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [userQuery, setUserQuery] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [mode, setMode] = useState<"auto" | "manual">("manual"); // "auto" or "manual"

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const frameIntervalRef = useRef<number | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const lastFrameHashRef = useRef<string>("");
  const lastProcessTimeRef = useRef<number>(0);
  const { toast } = useToast();

  // Initialize Web Speech API
  useEffect(() => {
    if (typeof window !== "undefined" && "webkitSpeechRecognition" in window) {
      const SpeechRecognition = (
        window as Window & {
          webkitSpeechRecognition: typeof webkitSpeechRecognition;
        }
      ).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript;
        setUserQuery(transcript);
        setIsListening(false);
        toast({
          title: "Voice input captured",
          description: transcript,
        });
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
        toast({
          title: "Voice input error",
          description: "Could not capture voice input",
          variant: "destructive",
        });
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, [toast]);

  // WebSocket connection
  const connectWebSocket = useCallback(() => {
    // Convert HTTP/HTTPS URL to WebSocket URL
    const wsUrl =
      API_BASE_URL.replace(/^http:/, "ws:").replace(/^https:/, "wss:") +
      "/api/live-vision";

    console.log("🔌 Attempting WebSocket connection to:", wsUrl);
    console.log("📡 API_BASE_URL:", API_BASE_URL);

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("✅ WebSocket connected successfully");
      toast({
        title: "Connected",
        description: "Live vision assistant is ready",
      });
    };

    ws.onmessage = (event) => {
      try {
        console.log("📨 WebSocket message received:", event.data);
        const data = JSON.parse(event.data);
        if (data.type === "connected") {
          console.log("✅ Server confirmed connection:", data.message);
          setOverlayText("👁️ Visual assistant ready. Looking...");
        } else if (data.type === "caption") {
          setOverlayText(data.text);
          setIsProcessing(false);
        } else if (data.type === "error") {
          setOverlayText("Error: " + data.message);
          setIsProcessing(false);

          // Check if it's a quota error
          const isQuotaError =
            data.message?.toLowerCase().includes("quota") ||
            data.message?.toLowerCase().includes("429") ||
            data.message?.toLowerCase().includes("rate limit");

          toast({
            title: isQuotaError ? "API Quota Exceeded" : "Processing error",
            description: isQuotaError
              ? "Free tier limit reached. Switch to Manual mode or wait a few minutes."
              : data.message,
            variant: "destructive",
            duration: 8000,
          });

          // Auto-switch to manual mode if quota exceeded
          if (isQuotaError && mode === "auto") {
            setMode("manual");
            if (frameIntervalRef.current) {
              clearInterval(frameIntervalRef.current);
              frameIntervalRef.current = null;
            }
          }
        } else {
          console.log("⚠️ Unknown message type:", data.type);
        }
      } catch (error) {
        console.error("❌ Error parsing WebSocket message:", error);
        console.error("❌ Raw message:", event.data);
      }
    };

    ws.onerror = (error) => {
      console.error("❌ WebSocket error event:", error);
      console.error("❌ WebSocket readyState:", ws.readyState);
      console.error("❌ WebSocket URL attempted:", wsUrl);

      // More detailed error message
      let errorMsg = "Failed to connect to vision service";
      if (ws.readyState === WebSocket.CLOSED) {
        errorMsg =
          "Connection closed. Is the backend server running on port 3001?";
      } else if (ws.readyState === WebSocket.CONNECTING) {
        errorMsg = "Connection timeout. Check if backend server is running.";
      }

      toast({
        title: "Connection error",
        description: errorMsg,
        variant: "destructive",
      });
    };

    ws.onclose = (event) => {
      console.log("🔌 WebSocket closed");
      console.log("📊 Close code:", event.code);
      console.log("📊 Close reason:", event.reason);
      console.log("📊 Was clean:", event.wasClean);

      // Don't auto-reconnect if it was a clean close or if we're not active
      if (!isActive) return;

      // Only reconnect on unexpected closes
      if (!event.wasClean && event.code !== 1000) {
        console.log("🔄 Attempting to reconnect in 3 seconds...");
        setTimeout(() => {
          if (isActive) {
            console.log("🔄 Reconnecting...");
            connectWebSocket();
          }
        }, 3000);
      }
    };

    wsRef.current = ws;
  }, [isActive, toast]);

  // Simple frame hash for comparison (detect scene changes)
  const getFrameHash = useCallback((canvas: HTMLCanvasElement): string => {
    // Create a simple hash from a downscaled version of the image
    // This is a lightweight way to detect if the scene has changed
    const smallCanvas = document.createElement("canvas");
    const ctx = smallCanvas.getContext("2d");
    if (!ctx) return "";

    // Use a small sample size for comparison (20x20 pixels)
    smallCanvas.width = 20;
    smallCanvas.height = 20;
    ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, 20, 20);
    const imageDataSmall = smallCanvas.toDataURL("image/jpeg", 0.3);

    // Simple hash: use a portion of the base64 string
    return imageDataSmall.substring(22, 122); // Skip data URL prefix
  }, []);

  // Capture frame from video with optimizations
  const captureFrame = useCallback(
    (force: boolean = false) => {
      if (!videoRef.current || !canvasRef.current || !wsRef.current) return;
      if (!force && isProcessing) return; // Don't send if already processing

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) return;

      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Motion/Scene change detection: only process if scene changed significantly
      if (!force && mode === "auto") {
        const frameHash = getFrameHash(canvas);
        const now = Date.now();
        const timeSinceLastProcess = now - lastProcessTimeRef.current;

        // Skip if frame is too similar (scene hasn't changed)
        if (
          frameHash === lastFrameHashRef.current &&
          timeSinceLastProcess < 5000
        ) {
          return; // Scene hasn't changed enough, skip this frame
        }

        // Rate limiting: don't process more than once every 5 seconds in auto mode
        if (timeSinceLastProcess < 5000) {
          return;
        }

        lastFrameHashRef.current = frameHash;
        lastProcessTimeRef.current = now;
      }

      // Convert to base64 JPEG (compressed) - only if we're going to send it
      const imageData = canvas.toDataURL("image/jpeg", 0.7);

      // Send frame to backend via WebSocket
      if (wsRef.current.readyState === WebSocket.OPEN) {
        setIsProcessing(true);
        wsRef.current.send(
          JSON.stringify({
            type: "frame",
            frame: imageData,
            query: userQuery || undefined,
            userId,
          })
        );
        // Clear query after sending
        if (userQuery) {
          setUserQuery("");
        }
      }
    },
    [userQuery, userId, mode, isProcessing, getFrameHash]
  );

  // Start video stream
  const startVideo = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsActive(true);
        setOverlayText("👁️ Calibrating visual assistant...");

        // Connect WebSocket
        connectWebSocket();

        // Start capturing frames based on mode
        // Auto mode: every 5 seconds (with motion detection)
        // Manual mode: only when user triggers
        if (mode === "auto") {
          frameIntervalRef.current = window.setInterval(() => {
            captureFrame(false);
          }, 5000); // Reduced from 1000ms to 5000ms (5 seconds)
        }
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
      toast({
        title: "Camera access denied",
        description: "Please allow camera access to use live vision",
        variant: "destructive",
      });
    }
  };

  // Stop video stream
  const stopVideo = () => {
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsActive(false);
    setOverlayText("");
    setIsProcessing(false);
  };

  // Handle voice input
  const startVoiceRecording = () => {
    if (!recognitionRef.current) {
      toast({
        title: "Voice input not available",
        description: "Your browser doesn't support voice input",
        variant: "destructive",
      });
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
      toast({
        title: "Listening...",
        description: "Speak your question",
      });
    }
  };

  // Handle manual query submit
  const handleQuerySubmit = () => {
    if (!userQuery.trim()) return;
    // Trigger immediate frame capture with query (force=true bypasses rate limiting)
    captureFrame(true);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopVideo();
    };
  }, []);

  return (
    <Card className="p-6 border-border bg-card/50 backdrop-blur-sm">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Video className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">
              Live AR Overlay Assistant
            </h3>
            <p className="text-sm text-muted-foreground">
              Real-time AI vision powered by Gemini
            </p>
          </div>
        </div>

        {/* Video Container */}
        <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden border border-border">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />

          {/* Hidden canvas for frame capture */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Holographic Overlay */}
          {isActive && (
            <div className="absolute bottom-[10%] left-1/2 transform -translate-x-1/2 w-[90%] max-w-2xl">
              <div className="overlay-holographic">
                {isProcessing ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Analyzing...</span>
                  </div>
                ) : overlayText ? (
                  <p className="text-sm md:text-base leading-relaxed">
                    {overlayText}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    👁️ Calibrating visual assistant...
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Start/Stop Button Overlay */}
          {!isActive && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <Button
                onClick={startVideo}
                size="lg"
                className="bg-primary hover:bg-primary/90"
              >
                <Video className="mr-2 h-5 w-5" />
                Start Live Vision
              </Button>
            </div>
          )}
        </div>

        {/* Controls */}
        {isActive && (
          <div className="space-y-3">
            {/* Mode Toggle */}
            <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Mode:</span>
                <span className="text-xs text-muted-foreground">
                  {mode === "auto"
                    ? "Auto (processes every 5s when scene changes)"
                    : "Manual (only when you ask questions)"}
                </span>
              </div>
              <Button
                variant={mode === "auto" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  const newMode = mode === "auto" ? "manual" : "auto";
                  setMode(newMode);

                  // Restart interval if switching to auto
                  if (frameIntervalRef.current) {
                    clearInterval(frameIntervalRef.current);
                    frameIntervalRef.current = null;
                  }

                  if (newMode === "auto" && isActive) {
                    frameIntervalRef.current = window.setInterval(() => {
                      captureFrame(false);
                    }, 5000);
                  }

                  toast({
                    title: `Switched to ${newMode} mode`,
                    description:
                      newMode === "auto"
                        ? "AI will describe scenes automatically (every 5s)"
                        : "AI will only respond when you ask questions",
                  });
                }}
              >
                {mode === "auto" ? "Auto" : "Manual"}
              </Button>
            </div>

            {/* Query Input */}
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder='e.g., "What is that red thing on the desk?"'
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleQuerySubmit()}
                className="flex-1"
                disabled={isProcessing}
              />
              <Button
                variant="outline"
                size="icon"
                onClick={startVoiceRecording}
                disabled={isListening || isProcessing}
                className={isListening ? "animate-pulse" : ""}
              >
                <Mic
                  className={`h-4 w-4 ${isListening ? "text-red-500" : ""}`}
                />
              </Button>
              <Button
                onClick={handleQuerySubmit}
                disabled={isProcessing || !userQuery.trim()}
                size="icon"
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Video className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* Info Text */}
            {mode === "manual" && (
              <p className="text-xs text-muted-foreground text-center">
                💡 Manual mode saves API quota. Ask questions to get AI
                descriptions.
              </p>
            )}

            {/* Stop Button */}
            <Button
              onClick={stopVideo}
              variant="destructive"
              className="w-full"
            >
              <VideoOff className="mr-2 h-4 w-4" />
              Stop Live Vision
            </Button>
          </div>
        )}
      </div>

      {/* Holographic Overlay Styles */}
      <style>{`
        .overlay-holographic {
          background: rgba(0, 255, 255, 0.1);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(0, 255, 255, 0.3);
          color: #00ffff;
          font-family: 'Inter', system-ui, sans-serif;
          text-shadow: 0 0 10px rgba(0, 255, 255, 0.8), 0 0 20px rgba(0, 255, 255, 0.4);
          padding: 16px 24px;
          border-radius: 12px;
          box-shadow: 0 0 30px rgba(0, 255, 255, 0.2), inset 0 0 20px rgba(0, 255, 255, 0.1);
          animation: pulse-glow 2s ease-in-out infinite;
        }

        @keyframes pulse-glow {
          0%, 100% {
            box-shadow: 0 0 30px rgba(0, 255, 255, 0.2), inset 0 0 20px rgba(0, 255, 255, 0.1);
          }
          50% {
            box-shadow: 0 0 40px rgba(0, 255, 255, 0.3), inset 0 0 30px rgba(0, 255, 255, 0.15);
          }
        }
      `}</style>
    </Card>
  );
};
