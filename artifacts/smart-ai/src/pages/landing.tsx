import { Link } from "wouter";
import { useUser } from "@clerk/react";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  const { isSignedIn } = useUser();

  const basePath = (import.meta as any).env?.BASE_URL?.replace(/\/$/, "") ?? "";

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="max-w-3xl text-center space-y-8">
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight bg-gradient-to-br from-indigo-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
          SmartAI Assistant
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Your personal AI companion that lives on your device. Intelligent, private, and always available.
        </p>
        
        <div className="flex justify-center gap-4 pt-8">
          {isSignedIn ? (
            <Link href="/dashboard">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground text-lg px-8">
                Enter Dashboard
              </Button>
            </Link>
          ) : (
            <div className="flex gap-3">
              <Link href="/sign-in">
                <Button size="lg" variant="outline" className="text-lg px-8">
                  Sign In
                </Button>
              </Link>
              <Link href="/sign-up">
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground text-lg px-8">
                  Get Started
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
