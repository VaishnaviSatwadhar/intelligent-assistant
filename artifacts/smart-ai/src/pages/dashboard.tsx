import { useUser } from "@clerk/react";
import { AppLayout } from "@/components/layout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useGetDashboardStats } from "@workspace/api-client-react";
import { Link } from "wouter";
import { MessageSquare, GraduationCap, Briefcase, FileText, Mic } from "lucide-react";

export default function DashboardPage() {
  const { user } = useUser();
  const { data: stats, isLoading } = useGetDashboardStats();

  const modes = [
    { id: "general", label: "General Chat", icon: MessageSquare, desc: "Ask anything, brainstorm, or write", color: "text-blue-400" },
    { id: "learning", label: "Learning Tutor", icon: GraduationCap, desc: "Explain concepts, test knowledge", color: "text-green-400" },
    { id: "career", label: "Career Coach", icon: Briefcase, desc: "Resume review, interview prep", color: "text-purple-400" },
    { id: "document", label: "Document AI", icon: FileText, desc: "Analyze PDFs and text files", color: "text-amber-400" },
    { id: "voice", label: "Voice Assistant", icon: Mic, desc: "Hands-free conversational AI", color: "text-rose-400" },
  ];

  return (
    <AppLayout>
      <div className="p-8 max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome back, {user?.firstName || 'User'}</h1>
          <p className="text-muted-foreground mt-2">Here's your personal AI intelligence overview.</p>
        </div>
        
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-pulse">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 bg-card rounded-lg border border-border"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Conversations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats?.totalConversations || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Messages</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats?.totalMessages || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Documents</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats?.totalDocuments || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Bookmarks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats?.bookmarkedConversations || 0}</div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Quick Launch</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {modes.map((mode) => {
              const Icon = mode.icon;
              return (
                <Link key={mode.id} href={`/chat?mode=${mode.id}`}>
                  <Card className="hover:border-primary/50 transition-colors cursor-pointer group h-full">
                    <CardContent className="p-6 flex flex-col items-start gap-4">
                      <div className={`p-3 rounded-xl bg-muted group-hover:bg-primary/10 transition-colors ${mode.color}`}>
                        <Icon size={24} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{mode.label}</h3>
                        <p className="text-sm text-muted-foreground">{mode.desc}</p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
