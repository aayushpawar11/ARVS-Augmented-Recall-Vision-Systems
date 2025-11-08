import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Mic, Search, Loader2, Volume2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { API_ENDPOINTS } from "@/config/api";

interface QueryResult {
  queryType?: 'location' | 'general';
  object?: string;
  answer?: string;
  matches: Array<{
    videoId?: string;
    filename: string;
    timestamp?: string;
    location?: string;
    confidence?: number;
    uploadedAt: string;
    relevantInfo?: string;
  }>;
  bestMatch?: {
    videoId?: string;
    filename: string;
    timestamp?: string;
    location?: string;
    confidence?: number;
    uploadedAt: string;
    relevantInfo?: string;
  };
  responseText: string;
  voiceAudio?: string;
}

interface VoiceQueryProps {
  userId?: string;
  onResult?: (result: QueryResult) => void;
}

export const VoiceQuery = ({ userId = "user-1", onResult }: VoiceQueryProps) => {
  const [query, setQuery] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!query.trim()) {
      toast({
        title: "Empty query",
        description: "Please enter a question",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(API_ENDPOINTS.QUERY, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, query }),
      });

      const data: QueryResult = await response.json();

      if (response.ok) {
        setResult(data);
        onResult?.(data);

        // Play voice response if available
        if (data.voiceAudio) {
          playAudio(data.voiceAudio);
        }

        toast({
          title: data.queryType === 'location' 
            ? (data.bestMatch ? "Found it!" : "Not found")
            : (data.answer ? "Answer found!" : "No answer found"),
          description: data.responseText || data.answer || "Query processed",
        });
      } else {
        throw new Error(data.error || 'Query failed');
      }
    } catch (error) {
      toast({
        title: "Search failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const playAudio = (base64Audio: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audio = new Audio(base64Audio);
    audioRef.current = audio;
    setIsPlayingAudio(true);

    audio.onended = () => {
      setIsPlayingAudio(false);
    };

    audio.onerror = () => {
      setIsPlayingAudio(false);
      console.error('Error playing audio');
    };

    audio.play().catch(err => {
      console.error('Error playing audio:', err);
      setIsPlayingAudio(false);
    });
  };

  const startVoiceRecording = () => {
    // In a real implementation, this would use Web Speech API
    // For now, we'll simulate it
    setIsRecording(true);
    toast({
      title: "Voice recording",
      description: "Click again to stop recording",
    });

    // Simulate voice input (in production, use Web Speech API)
    setTimeout(() => {
      setIsRecording(false);
      setQuery("Where did I leave my water bottle?");
      toast({
        title: "Voice input captured",
        description: "Click search to find your object",
      });
    }, 2000);
  };

  return (
    <Card className="p-6 border-border bg-card/50 backdrop-blur-sm">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Search className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Ask Questions About Your Videos</h3>
            <p className="text-sm text-muted-foreground">Find objects or ask questions - powered by Gemini AI</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Input
            type="text"
            placeholder='e.g., "Where did I leave my water bottle?" or "What was I doing in the video?"'
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1"
          />
          <Button
            variant="outline"
            size="icon"
            onClick={startVoiceRecording}
            disabled={isRecording || isSearching}
            className={isRecording ? "animate-pulse" : ""}
          >
            <Mic className={`h-4 w-4 ${isRecording ? "text-red-500" : ""}`} />
          </Button>
          <Button
            onClick={handleSearch}
            disabled={isSearching || !query.trim()}
            size="icon"
          >
            {isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>

        {result && (
          <div className="mt-4 p-4 rounded-lg bg-primary/5 border border-primary/20 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                {result.queryType === 'location' ? (
                  <>
                    <p className="font-medium text-foreground">
                      {result.object ? `Found: ${result.object}` : 'Search Results'}
                    </p>
                    {result.bestMatch && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {result.responseText}
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <p className="font-medium text-foreground mb-2">Answer:</p>
                    <p className="text-sm text-foreground leading-relaxed">
                      {result.answer || result.responseText}
                    </p>
                  </>
                )}
              </div>
              {result.voiceAudio && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => playAudio(result.voiceAudio!)}
                  disabled={isPlayingAudio}
                  className="flex-shrink-0"
                >
                  <Volume2 className="h-4 w-4" />
                </Button>
              )}
            </div>

            {result.bestMatch && (
              <div className="text-xs space-y-1 text-muted-foreground">
                {result.queryType === 'location' ? (
                  <>
                    {result.bestMatch.location && <p>📍 Location: {result.bestMatch.location}</p>}
                    <p>🕐 Time: {new Date(result.bestMatch.uploadedAt).toLocaleString()}</p>
                    <p>📹 Video: {result.bestMatch.filename}</p>
                    {result.bestMatch.confidence && (
                      <p>🎯 Confidence: {(result.bestMatch.confidence * 100).toFixed(0)}%</p>
                    )}
                  </>
                ) : (
                  <>
                    <p>📹 Video: {result.bestMatch.filename}</p>
                    <p>🕐 Recorded: {new Date(result.bestMatch.uploadedAt).toLocaleString()}</p>
                    {result.bestMatch.timestamp && (
                      <p>⏱️ Timestamp: {result.bestMatch.timestamp}</p>
                    )}
                    {result.bestMatch.relevantInfo && (
                      <p className="mt-2 text-foreground/80">{result.bestMatch.relevantInfo}</p>
                    )}
                  </>
                )}
              </div>
            )}

            {result.matches && result.matches.length > 1 && (
              <div className="pt-2 border-t border-primary/10">
                <p className="text-xs text-muted-foreground">
                  Found {result.matches.length} total {result.queryType === 'location' ? 'matches' : 'relevant videos'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};

