import { useState } from "react";
import { AppLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSendChatMessage } from "@workspace/api-client-react";
import {
  GraduationCap,
  BookOpen,
  Brain,
  HelpCircle,
  Lightbulb,
  Send,
  Loader2,
  Sparkles,
} from "lucide-react";

const LEARNING_PROMPTS = [
  { icon: BookOpen, label: "Explain a concept", prompt: "Explain the concept of " },
  { icon: Brain, label: "Quiz me", prompt: "Quiz me on the topic of " },
  { icon: HelpCircle, label: "Solve a problem", prompt: "Help me solve this problem: " },
  { icon: Lightbulb, label: "Summarize topic", prompt: "Summarize the key points about " },
];

const SAMPLE_TOPICS = [
  "Photosynthesis", "World War II", "Python programming", "Algebra basics",
  "The Solar System", "Indian history", "Machine learning", "Human anatomy"
];

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function LearnPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [language, setLanguage] = useState("en");
  const sendMessage = useSendChatMessage();

  const handleSend = async (text?: string) => {
    const content = text ?? input.trim();
    if (!content || sendMessage.isPending) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content }]);

    sendMessage.mutate(
      { data: { content, mode: "learning", language: language as "en" | "hi" | "mr" } },
      {
        onSuccess: (res) => {
          setMessages((prev) => [...prev, { role: "assistant", content: res.content }]);
        },
        onError: () => {
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: "Sorry, something went wrong. Please try again." },
          ]);
        },
      }
    );
  };

  return (
    <AppLayout>
      <div className="h-full flex flex-col max-w-5xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
            <GraduationCap size={22} className="text-green-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Learning Tutor</h1>
            <p className="text-sm text-muted-foreground">
              Your personal AI teacher — explain, quiz, and guide
            </p>
          </div>
          <div className="ml-auto flex gap-2">
            {["en", "hi", "mr"].map((lang) => (
              <Button
                key={lang}
                variant={language === lang ? "default" : "outline"}
                size="sm"
                onClick={() => setLanguage(lang)}
                className="text-xs"
              >
                {lang === "en" ? "EN" : lang === "hi" ? "हि" : "म"}
              </Button>
            ))}
          </div>
        </div>

        {messages.length === 0 ? (
          <div className="flex-1 space-y-6">
            {/* Quick actions */}
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Learning Modes
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {LEARNING_PROMPTS.map(({ icon: Icon, label, prompt }) => (
                  <Card
                    key={label}
                    className="cursor-pointer hover:border-primary/50 transition-colors group"
                    onClick={() => setInput(prompt)}
                  >
                    <CardContent className="p-4 flex flex-col items-center gap-2 text-center">
                      <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center group-hover:bg-green-500/20 transition-colors">
                        <Icon size={20} className="text-green-400" />
                      </div>
                      <span className="text-sm font-medium">{label}</span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Sample topics */}
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Try a Topic
              </h2>
              <div className="flex flex-wrap gap-2">
                {SAMPLE_TOPICS.map((topic) => (
                  <Badge
                    key={topic}
                    variant="outline"
                    className="cursor-pointer hover:bg-green-500/10 hover:border-green-500/50 transition-colors py-1.5 px-3"
                    onClick={() =>
                      handleSend(`Explain the concept of ${topic} in simple terms.`)
                    }
                  >
                    {topic}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <ScrollArea className="flex-1 mb-4 pr-4">
            <div className="space-y-4">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.role === "assistant" && (
                    <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center shrink-0 mt-1">
                      <Sparkles size={14} className="text-green-400" />
                    </div>
                  )}
                  <div
                    className={`rounded-2xl px-4 py-3 max-w-[75%] text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-tr-sm"
                        : "bg-card border border-border rounded-tl-sm"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {sendMessage.isPending && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                    <Loader2 size={14} className="animate-spin text-green-400" />
                  </div>
                  <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3">
                    <Loader2 size={14} className="animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        )}

        {/* Input */}
        <div className="flex gap-3 mt-auto">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask your tutor anything..."
            className="resize-none"
            rows={2}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <Button
            onClick={() => handleSend()}
            disabled={!input.trim() || sendMessage.isPending}
            size="icon"
            className="h-14 w-14 bg-green-600 hover:bg-green-700 shrink-0"
          >
            {sendMessage.isPending ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Send size={18} />
            )}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
