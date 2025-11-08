import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Brain, Eye, MapPin, Zap, Upload, Search } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-card">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Animated background grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)] opacity-20" />
        
        {/* Glow effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-gradient-radial from-primary/20 via-transparent to-transparent blur-3xl pointer-events-none" />

        <div className="container mx-auto px-4 pt-20 pb-32 relative">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 bg-primary/5 backdrop-blur-sm">
              <Zap className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-foreground">Powered by Gemini AI + Solana</span>
            </div>

            {/* Title */}
            <h1 className="text-6xl md:text-7xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-primary via-memory-pulse to-primary bg-clip-text text-transparent animate-neural-pulse">
                Never Forget
              </span>
              <br />
              <span className="text-foreground">Where You Left Anything</span>
            </h1>

            {/* Description */}
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              AI-powered spatial memory for smart glasses. Ask where you left your keys, water bottle, or anything else—and get an instant answer with visual proof.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button 
                size="lg" 
                className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-neural group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                <Upload className="mr-2 h-5 w-5" />
                Upload Memory Footage
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="border-primary/20 hover:bg-primary/5 backdrop-blur-sm"
              >
                <Search className="mr-2 h-5 w-5" />
                Search Your Memories
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 pt-12 max-w-2xl mx-auto">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">99.2%</div>
                <div className="text-sm text-muted-foreground">Object Detection</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-memory-pulse">&lt; 2s</div>
                <div className="text-sm text-muted-foreground">Search Speed</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-spatial-grid">100%</div>
                <div className="text-sm text-muted-foreground">Privacy First</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-4xl font-bold text-foreground">How It Works</h2>
            <p className="text-muted-foreground text-lg">Autonomous AI agents that understand your physical world</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="p-6 border-border bg-card/50 backdrop-blur-sm hover:border-primary/30 transition-all hover:shadow-neural group">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <Eye className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-foreground">Continuous Recording</h3>
              <p className="text-sm text-muted-foreground">
                Your smart glasses capture everything you see throughout the day
              </p>
            </Card>

            <Card className="p-6 border-border bg-card/50 backdrop-blur-sm hover:border-primary/30 transition-all hover:shadow-neural group">
              <div className="h-12 w-12 rounded-lg bg-secondary/10 flex items-center justify-center mb-4 group-hover:bg-secondary/20 transition-colors">
                <Brain className="h-6 w-6 text-secondary" />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-foreground">AI Analysis</h3>
              <p className="text-sm text-muted-foreground">
                Gemini Vision AI extracts objects, locations, and spatial relationships
              </p>
            </Card>

            <Card className="p-6 border-border bg-card/50 backdrop-blur-sm hover:border-primary/30 transition-all hover:shadow-neural group">
              <div className="h-12 w-12 rounded-lg bg-spatial-grid/10 flex items-center justify-center mb-4 group-hover:bg-spatial-grid/20 transition-colors">
                <MapPin className="h-6 w-6 text-spatial-grid" />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-foreground">Spatial Indexing</h3>
              <p className="text-sm text-muted-foreground">
                Every object is mapped with precise timestamp and location data
              </p>
            </Card>

            <Card className="p-6 border-border bg-card/50 backdrop-blur-sm hover:border-primary/30 transition-all hover:shadow-neural group">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <Search className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-foreground">Voice Search</h3>
              <p className="text-sm text-muted-foreground">
                Ask naturally and get instant answers with visual proof
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto">
          <Card className="p-12 border-primary/20 bg-gradient-to-br from-card via-card to-primary/5 backdrop-blur-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
            
            <div className="relative space-y-8">
              <div className="text-center space-y-4">
                <h2 className="text-3xl font-bold text-foreground">Built for Real Life</h2>
                <p className="text-muted-foreground">Solving problems that cost hours every week</p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <div className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                    </div>
                    <div>
                      <div className="font-medium text-foreground">"Where are my car keys?"</div>
                      <div className="text-sm text-muted-foreground">Last seen on kitchen counter at 2:34 PM</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-secondary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <div className="h-2 w-2 rounded-full bg-secondary" />
                    </div>
                    <div>
                      <div className="font-medium text-foreground">"Did I lock the front door?"</div>
                      <div className="text-sm text-muted-foreground">Yes, verified at 8:12 AM today</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-spatial-grid/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <div className="h-2 w-2 rounded-full bg-spatial-grid" />
                    </div>
                    <div>
                      <div className="font-medium text-foreground">"Where's my water bottle?"</div>
                      <div className="text-sm text-muted-foreground">Left in conference room B, 1 hour ago</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                    </div>
                    <div>
                      <div className="font-medium text-foreground">"When did I last see Sarah?"</div>
                      <div className="text-sm text-muted-foreground">Tuesday at coffee shop, 3:45 PM</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h2 className="text-3xl font-bold text-foreground">Built With Cutting-Edge Tech</h2>
          
          <div className="flex flex-wrap justify-center gap-4">
            {['Gemini 2.5 Flash', 'Solana', 'MongoDB Atlas', 'ElevenLabs', 'Vultr', 'Snowflake'].map((tech) => (
              <div 
                key={tech}
                className="px-6 py-3 rounded-full border border-primary/20 bg-card/50 backdrop-blur-sm hover:border-primary/40 transition-colors"
              >
                <span className="text-sm font-medium text-foreground">{tech}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border mt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-sm text-muted-foreground">
            <p>Built for AI ATL Hackathon 2025</p>
            <p className="mt-2">Privacy-first spatial memory powered by AI</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
