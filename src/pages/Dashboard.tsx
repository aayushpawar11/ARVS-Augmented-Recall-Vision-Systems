import { useState } from "react";
import { VideoUpload } from "@/components/VideoUpload";
import { VoiceQuery } from "@/components/VoiceQuery";
import { MemoryResults } from "@/components/MemoryResults";
import { VideoQuestions } from "@/components/VideoQuestions";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, Database, Coins, BarChart3 } from "lucide-react";

interface QueryResult {
  object: string;
  matches: Array<{
    videoId: string;
    filename: string;
    timestamp: string;
    location: string;
    confidence: number;
    uploadedAt: string;
  }>;
  bestMatch?: {
    videoId: string;
    filename: string;
    timestamp: string;
    location: string;
    confidence: number;
    uploadedAt: string;
  };
  responseText: string;
  voiceAudio?: string;
}

const Dashboard = () => {
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [uploadedVideoId, setUploadedVideoId] = useState<string | null>(null);
  const userId = "user-1"; // In production, get from auth

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-card">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold text-foreground">
              MemoryGlass Dashboard
            </h1>
            <p className="text-muted-foreground">
              Upload footage and search your spatial memories
            </p>
          </div>

          {/* Tech Stack Status */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4 border-border bg-card/50 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <Brain className="h-5 w-5 text-primary" />
                <div>
                  <div className="text-sm font-medium text-foreground">Gemini AI</div>
                  <div className="text-xs text-muted-foreground">Active</div>
                </div>
              </div>
            </Card>
            <Card className="p-4 border-border bg-card/50 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <Database className="h-5 w-5 text-primary" />
                <div>
                  <div className="text-sm font-medium text-foreground">MongoDB Atlas</div>
                  <div className="text-xs text-muted-foreground">Connected</div>
                </div>
              </div>
            </Card>
            <Card className="p-4 border-border bg-card/50 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <Coins className="h-5 w-5 text-primary" />
                <div>
                  <div className="text-sm font-medium text-foreground">Solana</div>
                  <div className="text-xs text-muted-foreground">Ready</div>
                </div>
              </div>
            </Card>
            <Card className="p-4 border-border bg-card/50 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <BarChart3 className="h-5 w-5 text-primary" />
                <div>
                  <div className="text-sm font-medium text-foreground">Snowflake</div>
                  <div className="text-xs text-muted-foreground">Analytics</div>
                </div>
              </div>
            </Card>
          </div>

          {/* Main Content */}
          <Tabs defaultValue="upload" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upload">Upload Video</TabsTrigger>
              <TabsTrigger value="search">Search Memories</TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="space-y-6">
              <VideoUpload 
                userId={userId} 
                onUploadComplete={(videoId) => {
                  setUploadedVideoId(videoId);
                  // Refresh questions after a delay to allow processing
                  setTimeout(() => {
                    setUploadedVideoId(videoId);
                  }, 10000); // Check after 10 seconds
                }}
              />
              {uploadedVideoId && (
                <VideoQuestions videoId={uploadedVideoId} userId={userId} />
              )}
            </TabsContent>

            <TabsContent value="search" className="space-y-6">
              <VoiceQuery userId={userId} onResult={setQueryResult} />
              
              {queryResult && (
                <MemoryResults
                  matches={queryResult.matches}
                  objectName={queryResult.object}
                />
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

