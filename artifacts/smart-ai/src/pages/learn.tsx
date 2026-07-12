import { useState, useRef } from "react";
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
  Mic,
  MicOff,
  Image as ImageIcon,
  X,
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
  attachments?: string[];
}

export default function LearnPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const [language, setLanguage] = useState("en");
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
    recognition.lang = language === "en" ? "en-US" : language === "hi" ? "hi-IN" : "mr-IN";

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
        { data: { content, mode: "learning", language: language as "en" | "hi" | "mr", attachments: uploadedUrls.length > 0 ? uploadedUrls : undefined } },
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
              placeholder="Ask your tutor anything..."
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
            className="h-[48px] w-[48px] shrink-0 mt-auto rounded-xl bg-green-600 hover:bg-green-700 text-primary-foreground"
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
