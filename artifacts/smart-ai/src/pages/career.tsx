import { useState } from "react";
import { AppLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSendChatMessage } from "@workspace/api-client-react";
import {
  Briefcase,
  FileText,
  Users,
  Target,
  TrendingUp,
  MessageSquare,
  Send,
  Loader2,
  Sparkles,
} from "lucide-react";

const CAREER_TOOLS = [
  {
    icon: FileText,
    label: "Resume Review",
    desc: "Get AI feedback on your resume",
    prompt: "Please review my resume and give feedback: ",
    color: "text-purple-400",
    bg: "bg-purple-500/10",
  },
  {
    icon: Users,
    label: "Interview Prep",
    desc: "Practice common interview questions",
    prompt: "Give me 5 common interview questions for a ",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
  },
  {
    icon: Target,
    label: "Goal Setting",
    desc: "Map out your career roadmap",
    prompt: "Help me create a career roadmap to become a ",
    color: "text-green-400",
    bg: "bg-green-500/10",
  },
  {
    icon: TrendingUp,
    label: "Skill Gap Analysis",
    desc: "Find skills you need to develop",
    prompt: "What skills do I need to transition from ",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
  },
  {
    icon: MessageSquare,
    label: "Cover Letter",
    desc: "Write a compelling cover letter",
    prompt: "Help me write a cover letter for a ",
    color: "text-rose-400",
    bg: "bg-rose-500/10",
  },
  {
    icon: Briefcase,
    label: "Job Search Strategy",
    desc: "Plan your job search approach",
    prompt: "Give me a job search strategy for ",
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
  },
];

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function CareerPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const sendMessage = useSendChatMessage();

  const handleSend = async (text?: string) => {
    const content = text ?? input.trim();
    if (!content || sendMessage.isPending) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content }]);

    sendMessage.mutate(
      { data: { content, mode: "career" } },
      {
        onSuccess: (res) => {
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: res.content },
          ]);
        },
        onError: () => {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: "Sorry, something went wrong. Please try again.",
            },
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
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
            <Briefcase size={22} className="text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Career Coach</h1>
            <p className="text-sm text-muted-foreground">
              AI-powered career guidance, resume help, and interview prep
            </p>
          </div>
        </div>

        {messages.length === 0 ? (
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Career Tools
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {CAREER_TOOLS.map(({ icon: Icon, label, desc, prompt, color, bg }) => (
                <Card
                  key={label}
                  className="cursor-pointer hover:border-purple-500/50 transition-colors group"
                  onClick={() => setInput(prompt)}
                >
                  <CardContent className="p-5 flex flex-col gap-3">
                    <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                      <Icon size={20} className={color} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">{label}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <ScrollArea className="flex-1 mb-4 pr-4">
            <div className="space-y-4">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex gap-3 ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {msg.role === "assistant" && (
                    <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0 mt-1">
                      <Sparkles size={14} className="text-purple-400" />
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
                  <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0">
                    <Loader2 size={14} className="animate-spin text-purple-400" />
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
            placeholder="Ask your career coach anything..."
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
            className="h-14 w-14 bg-purple-600 hover:bg-purple-700 shrink-0"
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
