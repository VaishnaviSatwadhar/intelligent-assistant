import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useListConversations,
  useGetConversation,
  useCreateConversation,
  useDeleteConversation,
  useSendChatMessage,
  useListAvailableModels,
  getListConversationsQueryKey,
  getGetConversationQueryKey,
} from "@workspace/api-client-react";
import type { Conversation } from "@workspace/api-client-react";
import {
  Send,
  Plus,
  Trash2,
  MessageSquare,
  Bot,
  User,
  Loader2,
  Mic,
  MicOff,
  Image as ImageIcon,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const MODE_LABELS: Record<string, string> = {
  general: "General",
  learning: "Learning",
  career: "Career",
  document: "Document",
  voice: "Voice",
  english_teacher: "English Teacher",
};

const MODE_COLORS: Record<string, string> = {
  general: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  learning: "bg-green-500/20 text-green-400 border-green-500/30",
  career: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  document: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  voice: "bg-rose-500/20 text-rose-400 border-rose-500/30",
  english_teacher: "bg-teal-500/20 text-teal-400 border-teal-500/30",
};

interface ChatPageProps {
  defaultMode?: string;
  hideModeSelector?: boolean;
}

export default function ChatPage({ defaultMode = "general", hideModeSelector = false }: ChatPageProps = {}) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [activeConversationId, setActiveConversationId] = useState<
    number | null
  >(null);
  const [input, setInput] = useState("");
  const [selectedMode, setSelectedMode] = useState<string>(defaultMode);
  const [selectedModel, setSelectedModel] = useState<string>("auto");
  const [language, setLanguage] = useState<string>("en");
  const bottomRef = useRef<HTMLDivElement>(null);
  
  const [isRecording, setIsRecording] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const autoSendRef = useRef(false);
  const initialInputRef = useRef("");
  const lastInputWasVoiceRef = useRef(false);

  const [education, setEducation] = useState<string>("High School");
  const [teacherGender, setTeacherGender] = useState<string>("female");
  const [scenario, setScenario] = useState<string>("Casual Conversation");
  const [isSetupComplete, setIsSetupComplete] = useState<boolean>(false);

  const speakText = (text: string) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language === "en" ? "en-US" : language === "hi" ? "hi-IN" : "mr-IN";
    
    // Select voice based on gender
    const voices = window.speechSynthesis.getVoices();
    const isFemale = teacherGender === "female";
    let selectedVoice = voices.find(v => 
      v.lang.startsWith(utterance.lang) && 
      v.name.toLowerCase().includes(isFemale ? "female" : "male")
    );
    // fallback to known generic names if not found
    if (!selectedVoice && isFemale) {
      selectedVoice = voices.find(v => v.lang.startsWith(utterance.lang) && (v.name.includes("Zira") || v.name.includes("Samantha") || v.name.includes("Google UK English Female")));
    }
    if (!selectedVoice && !isFemale) {
      selectedVoice = voices.find(v => v.lang.startsWith(utterance.lang) && (v.name.includes("David") || v.name.includes("Alex") || v.name.includes("Google UK English Male")));
    }
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    
    window.speechSynthesis.speak(utterance);
  };

  const { data: conversations, isLoading: loadingConvs } =
    useListConversations();

  // Ensure conversations is always an array
  const safeConversations = Array.isArray(conversations) ? conversations : [];
  const { data: activeConv, isLoading: loadingMessages } = useGetConversation(
    activeConversationId ?? 0,
    { query: { queryKey: getGetConversationQueryKey(activeConversationId ?? 0), enabled: activeConversationId !== null } }
  );
  const { data: models } = useListAvailableModels({ query: { queryKey: ["/api/models"], retry: false } });

  // Ensure models is always an array
  const safeModels = Array.isArray(models) ? models : [];

  const filteredConversations = hideModeSelector
    ? safeConversations.filter((c: Conversation) => c.mode === defaultMode)
    : safeConversations;

  const createConversation = useCreateConversation();
  const deleteConversation = useDeleteConversation();
  const sendMessage = useSendChatMessage();

  useEffect(() => {
    if (!isRecording && autoSendRef.current && input.trim()) {
      autoSendRef.current = false;
      handleSend();
    }
  }, [isRecording, input]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConv?.messages]);

  const handleMicClick = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      
      // Auto-send when manually stopped
      if (input.trim()) {
        autoSendRef.current = true;
        lastInputWasVoiceRef.current = true;
      }
      return;
    }
    
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }
    
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language === "en" ? "en-US" : language === "hi" ? "hi-IN" : "mr-IN";

    initialInputRef.current = input;

    recognition.onstart = () => setIsRecording(true);
    recognition.onresult = (event: any) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; ++i) {
        transcript += event.results[i][0].transcript;
      }
      setInput(initialInputRef.current ? initialInputRef.current + " " + transcript : transcript);
    };
    recognition.onerror = (event: any) => {
      console.error(event.error);
      setIsRecording(false);
    };
    recognition.onend = () => {
      setIsRecording(false);
    };
    
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

  const handleSend = async () => {
    if ((!input.trim() && attachments.length === 0) || sendMessage.isPending || isUploading) return;
    
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
      
      let content = input.trim();
      
      if (!activeConversationId && selectedMode === 'english_teacher' && isSetupComplete) {
        content = `[Context: The student's education level is ${education}. We are roleplaying the following scenario: ${scenario}. Please tailor your vocabulary and explanations appropriately and stay in character for the scenario.]\n\n${content}`;
      }
      
      setInput("");
      setAttachments([]);

      sendMessage.mutate(
        {
          data: {
            content,
            conversationId: activeConversationId,
            mode: selectedMode as "general" | "learning" | "career" | "document" | "voice" | "english_teacher",
            model: selectedModel === "auto" ? undefined : selectedModel,
            language: language as "en" | "hi" | "mr",
            attachments: uploadedUrls.length > 0 ? uploadedUrls : undefined
          },
        },
      {
        onSuccess: (res) => {
          if (res.conversationId && !activeConversationId) {
            setActiveConversationId(res.conversationId);
          }
          queryClient.invalidateQueries({
            queryKey: getListConversationsQueryKey(),
          });
          if (res.conversationId) {
            queryClient.invalidateQueries({
              queryKey: getGetConversationQueryKey(res.conversationId),
            });
          }
          if (lastInputWasVoiceRef.current || selectedMode === "english_teacher" || selectedMode === "voice") {
            speakText(res.content);
          }
          lastInputWasVoiceRef.current = false;
        },
      }
    );
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleNewChat = () => {
    setActiveConversationId(null);
    setInput("");
    if (selectedMode === 'english_teacher') {
      setIsSetupComplete(false);
    }
  };

  const handleDeleteConversation = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteConversation.mutate(
      { id },
      {
        onSuccess: () => {
          if (activeConversationId === id) setActiveConversationId(null);
          queryClient.invalidateQueries({
            queryKey: getListConversationsQueryKey(),
          });
        },
      }
    );
  };

  const currentMessages = Array.isArray(activeConv?.messages) ? activeConv.messages : [];

  return (
    <AppLayout>
      <div className="flex h-full">
        {/* Sidebar: conversation list */}
        <aside className="hidden lg:flex w-64 flex-col border-r border-border bg-card/30">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Conversations
            </span>
            <Button variant="ghost" size="icon" onClick={handleNewChat}>
              <Plus size={16} />
            </Button>
          </div>
          <ScrollArea className="flex-1">
            {loadingConvs ? (
              <div className="p-4 space-y-2">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-sm">
                No conversations yet
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {filteredConversations.map((c: Conversation) => (
                  <div
                    key={c.id}
                    onClick={() => setActiveConversationId(c.id)}
                    className={cn(
                      "group flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors",
                      activeConversationId === c.id
                        ? "bg-primary/20 text-primary"
                        : "hover:bg-accent"
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <MessageSquare size={14} className="shrink-0" />
                      <span className="text-sm truncate">{c.title}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      onClick={(e) => handleDeleteConversation(c.id, e)}
                    >
                      <Trash2 size={12} />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </aside>

        {/* Main chat area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top bar */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border flex-wrap">
            {!hideModeSelector && (
              <Select value={selectedMode} onValueChange={setSelectedMode}>
                <SelectTrigger className="w-36 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(MODE_LABELS)
                    .filter(([key]) => key !== "english_teacher")
                    .map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="w-28 h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="hi">हिंदी</SelectItem>
                <SelectItem value="mr">मराठी</SelectItem>
              </SelectContent>
            </Select>

            {safeModels.length > 0 && (
              <Select
                value={selectedModel}
                onValueChange={setSelectedModel}
              >
                <SelectTrigger className="w-44 h-8 text-sm">
                  <SelectValue placeholder="Auto model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto</SelectItem>
                  {safeModels.map((m) => (
                    <SelectItem key={m.name} value={m.name}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleNewChat}
              className="ml-auto"
            >
              <Plus size={14} className="mr-1" />
              New Chat
            </Button>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 px-4 py-6">
            {activeConversationId === null && currentMessages.length === 0 && !sendMessage.isPending ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center space-y-4">
                {selectedMode === 'english_teacher' && !isSetupComplete ? (
                  <div className="max-w-md w-full bg-card p-6 rounded-2xl border border-border shadow-sm space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center overflow-hidden mx-auto mb-4">
                      <img src="/ai_english_teacher.png" alt="English Teacher" className="w-full h-full object-cover" />
                    </div>
                    <h2 className="text-xl font-semibold">Setup Your AI Teacher</h2>
                    <p className="text-muted-foreground text-sm">Customize your learning experience before we begin.</p>
                    
                    <div className="space-y-4 text-left mt-6">
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium">Your Education Level</label>
                        <Select value={education} onValueChange={setEducation}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Middle School">Middle School</SelectItem>
                            <SelectItem value="High School">High School</SelectItem>
                            <SelectItem value="College/University">College/University</SelectItem>
                            <SelectItem value="Professional">Professional</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium">Teacher's Voice Gender</label>
                        <Select value={teacherGender} onValueChange={setTeacherGender}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="female">Female</SelectItem>
                            <SelectItem value="male">Male</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium">Practice Scenario</label>
                        <Select value={scenario} onValueChange={setScenario}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Casual Conversation">Casual Conversation</SelectItem>
                            <SelectItem value="Job Interview Practice">Job Interview Practice</SelectItem>
                            <SelectItem value="Travel & Tourism">Travel & Tourism</SelectItem>
                            <SelectItem value="Business English">Business English</SelectItem>
                            <SelectItem value="IELTS Speaking Practice">IELTS Speaking Practice</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button 
                        className="w-full mt-6 h-10" 
                        onClick={() => setIsSetupComplete(true)}
                      >
                        Start Chatting
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center overflow-hidden">
                      {selectedMode === 'english_teacher' ? (
                        <img src="/ai_english_teacher.png" alt="English Teacher" className="w-full h-full object-cover" />
                      ) : (
                        <Bot size={32} className="text-primary" />
                      )}
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold">
                        {selectedMode === 'english_teacher' ? "Start practicing your English!" : "Start a conversation"}
                      </h2>
                      <p className="text-muted-foreground text-sm mt-1">
                        {selectedMode === 'english_teacher' 
                          ? "Use the microphone or type below to begin speaking with your AI Teacher." 
                          : "Select a mode and type your message below"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {!hideModeSelector && Object.entries(MODE_LABELS)
                        .filter(([key]) => key !== "english_teacher")
                        .map(([key, label]) => (
                        <Badge
                          key={key}
                          variant="outline"
                          className={cn(
                            "cursor-pointer",
                            MODE_COLORS[key]
                          )}
                          onClick={() => setSelectedMode(key)}
                        >
                          {label}
                        </Badge>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ) : loadingMessages && !sendMessage.isPending ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex gap-3",
                      i % 2 === 0 ? "justify-end" : "justify-start"
                    )}
                  >
                    <Skeleton
                      className={cn(
                        "h-16 rounded-2xl",
                        i % 2 === 0 ? "w-48" : "w-64"
                      )}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4 max-w-3xl mx-auto">
                {currentMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex gap-3",
                      msg.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    {msg.role === "assistant" && (
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-1 overflow-hidden">
                        {selectedMode === 'english_teacher' ? (
                          <img src="/ai_english_teacher.png" alt="Teacher" className="w-full h-full object-cover" />
                        ) : (
                          <Bot size={16} className="text-primary" />
                        )}
                      </div>
                    )}
                    <div className={cn("flex flex-col gap-1.5 max-w-[75%]", msg.role === "user" ? "items-end" : "items-start")}>
                      {msg.role === "assistant" && msg.metadata && (() => {
                        try {
                          const meta = JSON.parse(msg.metadata);
                          if (meta.tokenUsage) {
                            return (
                              <div className="flex items-center gap-1.5 ml-1">
                                <Badge variant="outline" className="h-5 px-2 text-[10px] font-medium tracking-wider bg-background/50 text-muted-foreground border-border/50">
                                  ⚡ {meta.tokenUsage} TOKENS
                                </Badge>
                              </div>
                            );
                          }
                        } catch(e) {}
                        return null;
                      })()}
                      <div
                        className={cn(
                          "rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap flex flex-col gap-2",
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground rounded-tr-sm"
                            : "bg-card border border-border rounded-tl-sm"
                        )}
                      >
                        {msg.attachments && (msg.attachments as unknown as string[]).length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-1">
                            {(msg.attachments as unknown as string[]).map((url, i) => (
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
                    {msg.role === "user" && (
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0 mt-1">
                        <User size={16} />
                      </div>
                    )}
                  </div>
                ))}
                
                {sendMessage.isPending && sendMessage.variables?.data?.content && (
                  <div className="flex gap-3 justify-end">
                    <div className="bg-primary text-primary-foreground rounded-2xl px-4 py-3 max-w-[75%] text-sm leading-relaxed whitespace-pre-wrap rounded-tr-sm">
                      {sendMessage.variables.data.content}
                    </div>
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0 mt-1">
                      <User size={16} />
                    </div>
                  </div>
                )}
                
                {sendMessage.isPending && (
                  <div className="flex gap-3 justify-start">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-1 overflow-hidden">
                      {selectedMode === 'english_teacher' ? (
                        <img src="/ai_english_teacher.png" alt="Teacher" className="w-full h-full object-cover" />
                      ) : (
                        <Bot size={16} className="text-primary" />
                      )}
                    </div>
                    <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3">
                      <Loader2 size={16} className="animate-spin text-muted-foreground" />
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
            )}
          </ScrollArea>

          {/* Input */}
          <div className="p-4 border-t border-border bg-background relative z-10">
            <div className="flex flex-col gap-2 max-w-3xl mx-auto">
              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2 p-2 bg-card rounded-xl border border-border">
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
                    className="h-[48px] w-[48px] shrink-0 rounded-2xl transition-all"
                    onClick={handleMicClick}
                    title="Voice Input"
                  >
                    {isRecording ? <MicOff size={20} className="animate-pulse" /> : <Mic size={20} />}
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-[48px] w-[48px] shrink-0 rounded-2xl transition-all"
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
                  onChange={(e) => {
                    setInput(e.target.value);
                    lastInputWasVoiceRef.current = false;
                  }}
                  placeholder={`Message ${MODE_LABELS[selectedMode]} assistant...`}
                  className="resize-none min-h-[48px] flex-1 rounded-2xl bg-card border-border"
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    lastInputWasVoiceRef.current = false;
                    handleSend();
                  }
                }}
              />
                <Button
                  onClick={() => {
                    lastInputWasVoiceRef.current = false;
                    handleSend();
                  }}
                  disabled={(!input.trim() && attachments.length === 0) || sendMessage.isPending || isUploading || (selectedMode === 'english_teacher' && !activeConversationId && !isSetupComplete)}
                  size="icon"
                  className="h-[48px] w-[48px] shrink-0 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                {(sendMessage.isPending || isUploading) ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <Send size={20} />
                )}
              </Button>
            </div>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Press Enter to send · Shift+Enter for new line
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
