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
} from "lucide-react";
import { cn } from "@/lib/utils";

const MODE_LABELS: Record<string, string> = {
  general: "General",
  learning: "Learning",
  career: "Career",
  document: "Document",
  voice: "Voice",
};

const MODE_COLORS: Record<string, string> = {
  general: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  learning: "bg-green-500/20 text-green-400 border-green-500/30",
  career: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  document: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  voice: "bg-rose-500/20 text-rose-400 border-rose-500/30",
};

export default function ChatPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [activeConversationId, setActiveConversationId] = useState<
    number | null
  >(null);
  const [input, setInput] = useState("");
  const [selectedMode, setSelectedMode] = useState<string>("general");
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [language, setLanguage] = useState<string>("en");
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: conversations, isLoading: loadingConvs } =
    useListConversations();
  const { data: activeConv, isLoading: loadingMessages } = useGetConversation(
    activeConversationId ?? 0,
    { query: { queryKey: getGetConversationQueryKey(activeConversationId ?? 0), enabled: activeConversationId !== null } }
  );
  const { data: models } = useListAvailableModels({ query: { queryKey: ["/api/models"], retry: false } });

  const createConversation = useCreateConversation();
  const deleteConversation = useDeleteConversation();
  const sendMessage = useSendChatMessage();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConv?.messages]);

  const handleSend = async () => {
    if (!input.trim() || sendMessage.isPending) return;
    const content = input.trim();
    setInput("");

    sendMessage.mutate(
      {
        data: {
          content,
          conversationId: activeConversationId,
          mode: selectedMode as "general" | "learning" | "career" | "document" | "voice",
          model: selectedModel || undefined,
          language: language as "en" | "hi" | "mr",
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
        },
      }
    );
  };

  const handleNewChat = () => {
    setActiveConversationId(null);
    setInput("");
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

  const currentMessages = activeConv?.messages ?? [];

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
            ) : conversations?.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-sm">
                No conversations yet
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {conversations?.map((c: Conversation) => (
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
            <Select value={selectedMode} onValueChange={setSelectedMode}>
              <SelectTrigger className="w-36 h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(MODE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

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

            {models && models.length > 0 && (
              <Select
                value={selectedModel}
                onValueChange={setSelectedModel}
              >
                <SelectTrigger className="w-44 h-8 text-sm">
                  <SelectValue placeholder="Auto model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Auto</SelectItem>
                  {models.map((m) => (
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
            {activeConversationId === null && currentMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Bot size={32} className="text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">
                    Start a conversation
                  </h2>
                  <p className="text-muted-foreground text-sm mt-1">
                    Select a mode and type your message below
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center">
                  {Object.entries(MODE_LABELS).map(([key, label]) => (
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
              </div>
            ) : loadingMessages ? (
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
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-1">
                        <Bot size={16} className="text-primary" />
                      </div>
                    )}
                    <div
                      className={cn(
                        "rounded-2xl px-4 py-3 max-w-[75%] text-sm leading-relaxed whitespace-pre-wrap",
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground rounded-tr-sm"
                          : "bg-card border border-border rounded-tl-sm"
                      )}
                    >
                      {msg.content}
                    </div>
                    {msg.role === "user" && (
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0 mt-1">
                        <User size={16} />
                      </div>
                    )}
                  </div>
                ))}
                {sendMessage.isPending && (
                  <div className="flex gap-3 justify-start">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-1">
                      <Bot size={16} className="text-primary" />
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
          <div className="p-4 border-t border-border">
            <div className="flex gap-3 max-w-3xl mx-auto">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={`Message ${MODE_LABELS[selectedMode]} assistant...`}
                className="resize-none min-h-[48px] max-h-36"
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || sendMessage.isPending}
                size="icon"
                className="h-12 w-12 shrink-0"
              >
                {sendMessage.isPending ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Send size={18} />
                )}
              </Button>
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
