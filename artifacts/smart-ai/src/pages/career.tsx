import { useState, useRef } from "react";
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
  Mic,
  MicOff,
  Image as ImageIcon,
  X,
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
  attachments?: string[];
}

export default function CareerPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const sendMessage = useSendChatMessage();

  const handleMicClick = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }
    
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }
    
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = () => setIsRecording(true);
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0].transcript)
        .join("");
      setInput(prev => prev ? prev + " " + transcript : transcript);
    };
    recognition.onerror = (event: any) => {
      console.error(event.error);
      setIsRecording(false);
    };
    recognition.onend = () => setIsRecording(false);
    
    recognition.start();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments(prev => [...prev, ...Array.from(e.target.files!)]);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSend = async (text?: string) => {
    const content = text ?? input.trim();
    if ((!content && attachments.length === 0) || sendMessage.isPending || isUploading) return;
    
    setIsUploading(true);
    try {
      const uploadedUrls: string[] = [];
      for (const file of attachments) {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        if (!res.ok) throw new Error("Upload failed");
        const data = await res.json();
        uploadedUrls.push(data.url);
      }
      
      setInput("");
      setAttachments([]);
      setMessages((prev) => [...prev, { role: "user", content, attachments: uploadedUrls }]);

      sendMessage.mutate(
        { data: { content, mode: "career", attachments: uploadedUrls.length > 0 ? uploadedUrls : undefined } },
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
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploading(false);
    }
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
                    className={`rounded-2xl px-4 py-3 max-w-[75%] text-sm leading-relaxed whitespace-pre-wrap flex flex-col gap-2 ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-tr-sm"
                        : "bg-card border border-border rounded-tl-sm"
                    }`}
                  >
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-1">
                        {msg.attachments.map((url, i) => (
                          <div key={i} className="max-w-[200px] max-h-[200px] overflow-hidden rounded-lg bg-black/10 border border-black/10">
                            {url.match(/\.(mp4|webm|ogg)$/i) ? (
                              <video src={url} controls className="w-full h-full object-contain" />
                            ) : (
                              <img src={url} alt="attachment" className="w-full h-full object-cover" />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
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
        <div className="bg-background relative z-10 flex flex-col gap-2 mt-auto p-4 border border-border rounded-xl">
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {attachments.map((file, idx) => (
                <div key={idx} className="relative inline-flex items-center bg-muted/50 rounded-md p-1 pr-2 border border-border">
                  {file.type.startsWith("image/") ? (
                    <div className="w-8 h-8 rounded shrink-0 overflow-hidden bg-background mr-2 flex items-center justify-center">
                      <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded shrink-0 flex items-center justify-center bg-background mr-2 text-xs font-medium text-muted-foreground">
                      VID
                    </div>
                  )}
                  <span className="text-xs truncate max-w-[150px] mr-2">{file.name}</span>
                  <button onClick={() => removeAttachment(idx)} className="text-muted-foreground hover:text-foreground bg-background rounded-full p-0.5">
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-3 items-end">
            <div className="flex gap-2">
              <Button
                variant={isRecording ? "destructive" : "secondary"}
                size="icon"
                className="h-[48px] w-[48px] shrink-0 rounded-xl transition-all"
                onClick={handleMicClick}
                title="Voice Input"
              >
                {isRecording ? <MicOff size={20} className="animate-pulse" /> : <Mic size={20} />}
              </Button>
              <Button
                variant="secondary"
                size="icon"
                className="h-[48px] w-[48px] shrink-0 rounded-xl transition-all"
                onClick={() => fileInputRef.current?.click()}
                title="Upload Image/Video"
              >
                <ImageIcon size={20} />
              </Button>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*,video/*" 
                multiple 
                onChange={handleFileChange} 
              />
            </div>
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask your career coach anything..."
              className="resize-none min-h-[48px] max-h-36 flex-1 rounded-xl bg-card border-border"
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
            disabled={(!input.trim() && attachments.length === 0) || sendMessage.isPending || isUploading}
            size="icon"
            className="h-[48px] w-[48px] shrink-0 mt-auto rounded-xl bg-purple-600 hover:bg-purple-700 text-primary-foreground"
          >
            {(sendMessage.isPending || isUploading) ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Send size={20} />
            )}
          </Button>
        </div>
        </div>
      </div>
    </AppLayout>
  );
}
