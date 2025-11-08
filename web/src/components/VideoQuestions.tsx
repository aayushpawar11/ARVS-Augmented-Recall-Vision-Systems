import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Clock, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { API_ENDPOINTS } from "@/config/api";

interface Question {
  question: string;
  answer: string;
  timestamp: string;
  confidence?: number;
  answeredAt: string;
}

interface VideoQuestionsProps {
  videoId: string;
  userId?: string;
}

export const VideoQuestions = ({ videoId, userId = "user-1" }: VideoQuestionsProps) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    const fetchQuestions = async () => {
      if (!videoId) return;

      setLoading(true);
      try {
        // Try to get questions from video ID (could be filename or MongoDB _id)
        const response = await fetch(API_ENDPOINTS.VIDEO_QUESTIONS(videoId));
        
        if (response.ok) {
          const data = await response.json();
          setQuestions(data.questions || []);
        } else {
          // If that fails, try getting from user's videos
          const videosResponse = await fetch(API_ENDPOINTS.VIDEOS(userId));
          if (videosResponse.ok) {
            const videosData = await videosResponse.json();
            const video = videosData.videos?.find((v: any) => 
              v._id === videoId || v.filename === videoId
            );
            if (video?.questions) {
              setQuestions(video.questions);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching questions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, [videoId, userId]);

  if (loading) {
    return (
      <Card className="p-4 border-border bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading questions...</span>
        </div>
      </Card>
    );
  }

  if (questions.length === 0) {
    return (
      <Card className="p-4 border-border bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <MessageSquare className="h-4 w-4" />
          <span className="text-sm">No questions detected in this video</span>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          💡 Tip: Ask questions while recording (e.g., "What was I doing?") and they'll be answered automatically!
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-4 border-border bg-card/50 backdrop-blur-sm">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-foreground">
              Questions Asked in Video ({questions.length})
            </h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>

        {expanded && (
          <div className="space-y-3">
            {questions.map((q, index) => (
              <div
                key={index}
                className="p-3 rounded-lg bg-primary/5 border border-primary/10 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {q.timestamp}
                      </span>
                      {q.confidence && (
                        <span className="text-xs text-muted-foreground">
                          • {Math.round(q.confidence * 100)}% confidence
                        </span>
                      )}
                    </div>
                    <p className="font-medium text-foreground text-sm mb-2">
                      ❓ {q.question}
                    </p>
                    <p className="text-sm text-foreground/80 leading-relaxed">
                      💬 {q.answer}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};

