import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Video, Mic, MicOff, Square, Loader2, MessageSquare, X, Volume2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { API_ENDPOINTS } from "@/config/api";

interface LiveStreamProps {
  userId?: string;
}

interface DetectedQuestion {
  question: string;
  timestamp: number;
  answered: boolean;
  answer?: string;
  usedMemory?: boolean;
}

export const LiveStream = ({ userId = "user-1" }: LiveStreamProps) => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [questions, setQuestions] = useState<DetectedQuestion[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [currentAnswer, setCurrentAnswer] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);
  const questionBufferRef = useRef<string>("");
  const lastAnalysisTimeRef = useRef<number>(0);
  const videoChunksRef = useRef<Blob[]>([]);
  const sessionStartedRef = useRef<boolean>(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const { toast } = useToast();

  // Initialize Web Speech API for real-time transcription
  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn('Speech recognition not supported');
      return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
          questionBufferRef.current += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      setTranscript(prev => prev + finalTranscript);
      
      // Check for questions in the buffer (debounced)
      if (finalTranscript) {
        checkForQuestion(questionBufferRef.current);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
    };

    recognitionRef.current = recognition;
  }, []);

  // Check if text contains a question
  const checkForQuestion = (text: string) => {
    const questionWords = ['what', 'where', 'when', 'who', 'why', 'how', 'did', 'do', 'does', 'is', 'are', 'was', 'were', 'can', 'could', 'should', 'would'];
    const lowerText = text.toLowerCase().trim();
    
    // Check if it ends with question mark or starts with question word
    const hasQuestionMark = lowerText.endsWith('?');
    const startsWithQuestionWord = questionWords.some(word => lowerText.startsWith(word));
    const hasQuestionPattern = lowerText.includes(' what ') || lowerText.includes(' where ') || lowerText.includes(' how ');
    
    if ((hasQuestionMark || startsWithQuestionWord || hasQuestionPattern) && lowerText.length > 10) {
      // Extract the question (last sentence)
      const sentences = text.split(/[.!?]/).filter(s => s.trim().length > 0);
      const lastSentence = sentences[sentences.length - 1]?.trim();
      
      if (lastSentence && !questions.some(q => q.question === lastSentence)) {
        const newQuestion: DetectedQuestion = {
          question: lastSentence + (lastSentence.endsWith('?') ? '' : '?'),
          timestamp: Date.now(),
          answered: false
        };
        
        setQuestions(prev => [...prev, newQuestion]);
        questionBufferRef.current = ''; // Clear buffer
        
        // Answer the question immediately
        answerQuestion(newQuestion);
      }
    }
  };

  // Answer question using recent video chunk
  const answerQuestion = async (question: DetectedQuestion) => {
    setIsProcessing(true);
    
    try {
      // Get recent video chunk (last 5-10 seconds)
      if (videoChunksRef.current.length === 0) {
        toast({
          title: "No video available",
          description: "Please wait a moment for video to buffer",
          variant: "destructive",
        });
        return;
      }

      // Create a blob from recent chunks (last 10 seconds worth)
      const recentChunks = videoChunksRef.current.slice(-3); // Last 3 chunks (~6-9 seconds)
      const videoBlob = new Blob(recentChunks, { type: 'video/webm' });
      
      // Create FormData
      const formData = new FormData();
      formData.append('video', videoBlob, 'live-chunk.webm');
      formData.append('question', question.question);
      formData.append('userId', userId);
      formData.append('timestamp', question.timestamp.toString());

      const response = await fetch(API_ENDPOINTS.LIVE_ANSWER, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.status === 429) {
        // Rate limited
        toast({
          title: "Too many questions",
          description: `Please wait ${data.retryAfter || 5} seconds before asking another question.`,
          variant: "destructive",
        });
        setQuestions(prev => prev.map(q => 
          q.timestamp === question.timestamp 
            ? { ...q, answer: 'Rate limited - please wait a moment.', answered: true }
            : q
        ));
        return;
      }

      if (response.ok && data.answer) {
        const answer = data.answer;
        
        // Update question with answer
        setQuestions(prev => prev.map(q => 
          q.timestamp === question.timestamp 
            ? { 
                ...q, 
                answer: answer, 
                answered: true,
                usedMemory: data.usedMemory || false
              }
            : q
        ));
        
        // Display answer prominently
        setCurrentAnswer(answer);
        
        // Show memory usage indicator
        if (data.usedMemory && data.memoryContext) {
          toast({
            title: "🧠 Memory search",
            description: `Found ${data.memoryContext.objectsFound} objects in session memory`,
          });
        }
        
        // Play voice response immediately and automatically
        if (data.voiceAudio) {
          playAudioResponse(data.voiceAudio);
        } else {
          // Fallback: Use browser TTS if ElevenLabs audio not available
          if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(answer);
            utterance.rate = 1.0;
            utterance.pitch = 1.0;
            utterance.volume = 1.0;
            speechSynthesis.speak(utterance);
          }
        }
        
        // Clear current answer after 10 seconds
        setTimeout(() => {
          setCurrentAnswer(null);
        }, 10000);
      } else {
        throw new Error(data.error || 'Failed to get answer');
      }
    } catch (error) {
      console.error('Error answering question:', error);
      setQuestions(prev => prev.map(q => 
        q.timestamp === question.timestamp 
          ? { ...q, answer: 'Unable to generate answer at this time.', answered: true }
          : q
      ));
    } finally {
      setIsProcessing(false);
    }
  };

  const playAudioResponse = (base64Audio: string) => {
    // Stop any currently playing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    const audio = new Audio(base64Audio);
    audioRef.current = audio;
    setIsPlayingAudio(true);

    audio.onended = () => {
      setIsPlayingAudio(false);
      audioRef.current = null;
    };

    audio.onerror = () => {
      setIsPlayingAudio(false);
      audioRef.current = null;
      console.error('Error playing audio');
    };

    // Play immediately
    audio.play().catch(err => {
      console.error('Error playing audio:', err);
      setIsPlayingAudio(false);
      audioRef.current = null;
    });
  };

  const startStream = async () => {
    try {
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: 'user' },
        audio: true
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      streamRef.current = stream;
      setIsStreaming(true);

      // Start live stream session on server
      try {
        await fetch(API_ENDPOINTS.LIVE_STREAM_START, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId })
        });
        sessionStartedRef.current = true;
      } catch (error) {
        console.error('Error starting session:', error);
      }

      // Start MediaRecorder for video chunks
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp8,opus'
      });

      mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          videoChunksRef.current.push(event.data);
          // Keep only last 10 chunks to manage memory
          if (videoChunksRef.current.length > 10) {
            videoChunksRef.current.shift();
          }

          // Send chunk to server for memory storage (background, non-blocking)
          if (sessionStartedRef.current) {
            const formData = new FormData();
            formData.append('video', event.data, 'chunk.webm');
            formData.append('userId', userId);

            // Don't await - fire and forget for background processing
            fetch(API_ENDPOINTS.LIVE_STREAM_CHUNK, {
              method: 'POST',
              body: formData
            }).catch(err => console.error('Error storing chunk:', err));
          }
        }
      };

      // Record in 3-second chunks for efficient processing
      mediaRecorder.start(3000);
      mediaRecorderRef.current = mediaRecorder;

      // Start speech recognition
      if (recognitionRef.current) {
        recognitionRef.current.start();
        setIsRecording(true);
      }

      toast({
        title: "Live stream started",
        description: "Ask questions naturally - they'll be answered in real-time!",
      });
    } catch (error) {
      console.error('Error starting stream:', error);
      toast({
        title: "Failed to start stream",
        description: "Please allow camera and microphone access",
        variant: "destructive",
      });
    }
  };

  const stopStream = async () => {
    // End session on server
    if (sessionStartedRef.current) {
      try {
        await fetch(API_ENDPOINTS.LIVE_STREAM_END, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId })
        });
      } catch (error) {
        console.error('Error ending session:', error);
      }
      sessionStartedRef.current = false;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }

    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsStreaming(false);
    setIsRecording(false);
    setTranscript("");
    setQuestions([]);
    setCurrentAnswer(null);
    videoChunksRef.current = [];
    questionBufferRef.current = "";
    
    // Stop any playing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
    }

    toast({
      title: "Stream stopped",
      description: "Recording ended and session saved",
    });
  };

  return (
    <Card className="p-6 border-border bg-card/50 backdrop-blur-sm">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Video className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Live Stream & Real-Time Q&A</h3>
            <p className="text-sm text-muted-foreground">Ask questions while recording - get instant answers with memory!</p>
            <p className="text-xs text-primary/80 mt-1">
              💡 Try: "Did I leave my water bottle there a few minutes ago?" - it remembers!
            </p>
          </div>
        </div>

        {/* Video Preview */}
        <div className="relative w-full bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
          />
          {!isStreaming && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
              <div className="text-center space-y-2">
                <Video className="h-12 w-12 text-muted-foreground mx-auto" />
                <p className="text-sm text-muted-foreground">Camera preview will appear here</p>
              </div>
            </div>
          )}
          
          {/* Current Answer Overlay - Prominently displayed */}
          {currentAnswer && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/80 to-transparent p-4">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Answer:</p>
                  <p className="text-base font-medium text-white leading-relaxed">
                    {currentAnswer}
                  </p>
                </div>
                {isPlayingAudio && (
                  <div className="flex-shrink-0">
                    <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center animate-pulse">
                      <Volume2 className="h-3 w-3 text-primary" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex gap-2">
          {!isStreaming ? (
            <Button onClick={startStream} className="flex-1" size="lg">
              <Video className="mr-2 h-4 w-4" />
              Start Live Stream
            </Button>
          ) : (
            <Button onClick={stopStream} variant="destructive" className="flex-1" size="lg">
              <Square className="mr-2 h-4 w-4" />
              Stop Stream
            </Button>
          )}
        </div>

        {/* Status */}
        {isStreaming && (
          <div className="flex items-center gap-2 text-sm">
            <div className={`h-2 w-2 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-400'}`} />
            <span className="text-muted-foreground">
              {isRecording ? 'Listening...' : 'Streaming'}
            </span>
            {isProcessing && (
              <>
                <Loader2 className="h-3 w-3 animate-spin text-primary" />
                <span className="text-muted-foreground">Processing question...</span>
              </>
            )}
          </div>
        )}

        {/* Transcript */}
        {transcript && (
          <div className="p-3 rounded-lg bg-muted/50 border border-border">
            <p className="text-xs font-medium text-muted-foreground mb-1">Live Transcript:</p>
            <p className="text-sm text-foreground">{transcript}</p>
          </div>
        )}

        {/* Questions & Answers History */}
        {questions.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              <h4 className="text-sm font-semibold text-foreground">Question History:</h4>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {questions.slice().reverse().map((q, index) => (
                <div
                  key={`${q.timestamp}-${index}`}
                  className={`p-3 rounded-lg border space-y-2 ${
                    q.answered 
                      ? 'bg-primary/5 border-primary/10' 
                      : 'bg-muted/30 border-border'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground mb-1">
                        ❓ {q.question}
                      </p>
                      {q.answered ? (
                        <div>
                          <p className="text-sm text-foreground/80">
                            💬 {q.answer || 'Processing...'}
                          </p>
                          {q.usedMemory && (
                            <p className="text-xs text-primary/70 mt-1">
                              🧠 Answered using session memory
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          <span>Analyzing video and memory...</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

