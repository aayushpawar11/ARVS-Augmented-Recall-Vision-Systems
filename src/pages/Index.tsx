import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Video, Square, MessageSquare, Volume2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [currentAnswer, setCurrentAnswer] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();

  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast({
          title: "Camera not supported",
          description: "Your browser doesn't support camera access.",
          variant: "destructive",
        });
        return;
      }

      const isSecure = window.location.protocol === 'https:' || 
                       window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1';
      
      if (!isSecure) {
        toast({
          title: "HTTPS required",
          description: "Camera access requires HTTPS or localhost.",
          variant: "destructive",
        });
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 1280 }, 
          height: { ideal: 720 }, 
          facingMode: 'user' 
        },
        audio: true
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(err => {
          console.error('Error playing video:', err);
        });
      }

      streamRef.current = stream;
      setIsRecording(true);

      toast({
        title: "Recording started",
        description: "Camera is now active",
      });
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Failed to start recording",
        description: error instanceof Error ? error.message : "Please allow camera access",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsRecording(false);
    toast({
      title: "Recording stopped",
      description: "Camera has been stopped",
    });
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div className="h-screen w-screen bg-black flex flex-col overflow-hidden">
      {/* Camera Preview - Full Screen */}
      <div className="flex-1 relative w-full h-full">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover"
        />
        {!isRecording && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <div className="text-center space-y-4">
              <Video className="h-20 w-20 text-white/60 mx-auto" />
              <p className="text-base text-white/80">Camera preview will appear here</p>
            </div>
          </div>
        )}

        {/* Answer Overlay - Displayed at top */}
        {currentAnswer && (
          <div className="absolute top-0 left-0 right-0 px-4 pt-4">
            <div className="max-w-2xl mx-auto p-4">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/30 backdrop-blur-md flex items-center justify-center flex-shrink-0 border border-primary/20">
                  <MessageSquare className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-white/90 mb-1 drop-shadow-lg">Answer:</p>
                  <p className="text-lg font-medium text-white leading-relaxed drop-shadow-lg">
                    {currentAnswer}
                  </p>
                </div>
                {isPlayingAudio && (
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 rounded-full bg-primary/30 backdrop-blur-md flex items-center justify-center animate-pulse border border-primary/20">
                      <Volume2 className="h-4 w-4 text-primary" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Start Recording Button - Fixed at bottom */}
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
        <div className="max-w-md mx-auto">
          {!isRecording ? (
            <Button 
              onClick={startRecording} 
              className="w-full h-16 text-xl font-semibold shadow-lg" 
              size="lg"
            >
              <Video className="mr-3 h-6 w-6" />
              Start Recording
            </Button>
          ) : (
            <Button 
              onClick={stopRecording} 
              variant="destructive" 
              className="w-full h-16 text-xl font-semibold shadow-lg" 
              size="lg"
            >
              <Square className="mr-3 h-6 w-6" />
              Stop Recording
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;
