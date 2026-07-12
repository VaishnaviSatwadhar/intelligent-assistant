import { Link, useLocation } from "wouter";
import { useUser, useClerk } from "@clerk/react";
import { 
  LayoutDashboard, 
  MessageSquare, 
  GraduationCap, 
  Briefcase, 
  FileText, 
  Bookmark, 
  User, 
  Settings,
  LogOut,
  Menu,
  Wand2,
  Mic
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user } = useUser();
  const { signOut } = useClerk();
  const [mobileOpen, setMobileOpen] = useState(false);

  const basePath = (import.meta as any).env?.BASE_URL?.replace(/\/$/, "") ?? "";

  const handleLogout = () => {
    signOut({ redirectUrl: basePath || "/" });
  };

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/chat", label: "Chat", icon: MessageSquare },
    { href: "/learn", label: "Learning", icon: GraduationCap },
    { href: "/career", label: "Career", icon: Briefcase },
    { href: "/documents", label: "Documents", icon: FileText },
    { href: "/english-teacher", label: "English Teacher", icon: Mic },
    { href: "/bookmarks", label: "Bookmarks", icon: Bookmark },
    { href: "/generate", label: "Media Gen", icon: Wand2 },
  ];

  const bottomNavItems = [
    { href: "/profile", label: "Profile", icon: User },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-sidebar border-r border-sidebar-border text-sidebar-foreground">
      <div className="p-6">
        <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-br from-indigo-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
          SmartAI
        </h2>
      </div>
      <nav className="flex-1 px-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href || location.startsWith(`${item.href}/`);
          return (
            <Link key={item.href} href={item.href}>
              <span className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors cursor-pointer ${
                isActive 
                  ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium" 
                  : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}>
                <Icon size={18} />
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-sidebar-border space-y-2">
        {bottomNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <span className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors cursor-pointer ${
                isActive 
                  ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium" 
                  : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}>
                <Icon size={18} />
                {item.label}
              </span>
            </Link>
          );
        })}
        <button 
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 w-full rounded-md transition-colors hover:bg-destructive hover:text-destructive-foreground"
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <aside className="hidden md:block w-64 h-full shrink-0">
        <SidebarContent />
      </aside>

      <div className="md:hidden fixed top-0 left-0 right-0 h-16 border-b border-border bg-background z-50 flex items-center px-4 justify-between">
        <h2 className="text-xl font-bold bg-gradient-to-br from-indigo-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
          SmartAI
        </h2>
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64">
            <SidebarContent />
          </SheetContent>
        </Sheet>
      </div>

      <main className="flex-1 h-full overflow-y-auto pt-16 md:pt-0 relative">
        {children}
      </main>
    </div>
  );
}
