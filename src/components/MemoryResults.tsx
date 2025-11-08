import { Card } from "@/components/ui/card";
import { MapPin, Clock, Video, TrendingUp } from "lucide-react";

interface MemoryMatch {
  videoId: string;
  filename: string;
  timestamp: string;
  location: string;
  confidence: number;
  uploadedAt: string;
}

interface MemoryResultsProps {
  matches: MemoryMatch[];
  objectName: string;
}

export const MemoryResults = ({ matches, objectName }: MemoryResultsProps) => {
  if (matches.length === 0) {
    return (
      <Card className="p-8 border-border bg-card/50 backdrop-blur-sm text-center">
        <p className="text-muted-foreground">No matches found for "{objectName}"</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold text-foreground">
          Found {matches.length} {matches.length === 1 ? 'match' : 'matches'} for "{objectName}"
        </h3>
      </div>

      <div className="grid gap-4">
        {matches.map((match, index) => (
          <Card
            key={index}
            className="p-4 border-border bg-card/50 backdrop-blur-sm hover:border-primary/30 transition-all"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Video className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">
                      {match.filename}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      <span>{match.location}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{new Date(match.uploadedAt).toLocaleString()}</span>
                    </div>
                  </div>

                  {match.timestamp && (
                    <div className="text-xs text-muted-foreground">
                      Timestamp: {match.timestamp}
                    </div>
                  )}
                </div>

                <div className="text-right">
                  <div className="text-sm font-semibold text-primary">
                    {(match.confidence * 100).toFixed(0)}%
                  </div>
                  <div className="text-xs text-muted-foreground">confidence</div>
                </div>
              </div>

              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${match.confidence * 100}%` }}
                />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

