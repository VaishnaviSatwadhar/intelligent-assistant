import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useGetUserProfile,
  useUpdateUserProfile,
  useListAvailableModels,
  getGetUserProfileQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useTheme } from "@/components/theme-provider";
import {
  Settings as SettingsIcon,
  Globe,
  Palette,
  Cpu,
  Mic,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
  Key,
  Bot,
} from "lucide-react";

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { setTheme } = useTheme();
  const { data: profile, isLoading } = useGetUserProfile();
  const { data: models, isLoading: loadingModels, isError: modelsError } = useListAvailableModels({
    query: { queryKey: ["/api/models"], retry: false },
  });
  const updateProfile = useUpdateUserProfile();

  // Ensure models is always an array
  const safeModels = Array.isArray(models) ? models : [];

  const [language, setLanguage] = useState("en");
  const [theme, setThemeLocal] = useState<"light" | "dark" | "system">("dark");
  const [preferredModel, setPreferredModel] = useState("");
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [aiProvider, setAiProvider] = useState<"ollama" | "openai" | "anthropic">("ollama");
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [anthropicApiKey, setAnthropicApiKey] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (profile) {
      setLanguage(profile.preferredLanguage ?? "en");
      setThemeLocal((profile.theme as "light" | "dark" | "system") ?? "dark");
      setPreferredModel(profile.preferredModel ?? "");
      setVoiceEnabled(profile.voiceEnabled ?? false);
      setAiProvider((profile.aiProvider as "ollama" | "openai" | "anthropic") ?? "ollama");
      setOpenaiApiKey(profile.openaiApiKey ?? "");
      setAnthropicApiKey(profile.anthropicApiKey ?? "");
    }
  }, [profile]);

  const handleSave = () => {
    updateProfile.mutate(
      {
        data: {
          preferredLanguage: language as "en" | "hi" | "mr",
          theme: theme as "light" | "dark" | "system",
          preferredModel: preferredModel || undefined,
          voiceEnabled,
          aiProvider,
          openaiApiKey: openaiApiKey || undefined,
          anthropicApiKey: anthropicApiKey || undefined,
        },
      },
      {
        onSuccess: () => {
          setTheme(theme);
          setSaved(true);
          queryClient.invalidateQueries({ queryKey: getGetUserProfileQueryKey() });
          setTimeout(() => setSaved(false), 2000);
        },
      }
    );
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-6 max-w-2xl mx-auto space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <SettingsIcon size={22} className="text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Settings</h1>
            <p className="text-sm text-muted-foreground">
              Customize your SmartAI experience
            </p>
          </div>
        </div>

        {/* Language */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe size={18} className="text-blue-400" />
              Language
            </CardTitle>
            <CardDescription>Choose your preferred response language</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {[
                { value: "en", label: "English", emoji: "🇬🇧" },
                { value: "hi", label: "हिंदी", emoji: "🇮🇳" },
                { value: "mr", label: "मराठी", emoji: "🇮🇳" },
              ].map(({ value, label, emoji }) => (
                <Button
                  key={value}
                  variant={language === value ? "default" : "outline"}
                  onClick={() => setLanguage(value)}
                  className="gap-2"
                >
                  <span>{emoji}</span>
                  {label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Theme */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette size={18} className="text-purple-400" />
              Appearance
            </CardTitle>
            <CardDescription>Choose your preferred color theme</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {(["light", "dark", "system"] as const).map((t) => (
                <Button
                  key={t}
                  variant={theme === t ? "default" : "outline"}
                  onClick={() => setThemeLocal(t)}
                  className="capitalize"
                >
                  {t === "light" ? "☀️" : t === "dark" ? "🌙" : "💻"} {t}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* AI Model */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cpu size={18} className="text-green-400" />
              AI Model
            </CardTitle>
            <CardDescription>Select the default Ollama model for responses</CardDescription>
          </CardHeader>
          <CardContent>
            {modelsError ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertCircle size={16} className="text-amber-400" />
                Ollama is not running — install it locally to use custom models.
              </div>
            ) : loadingModels ? (
              <Skeleton className="h-10 w-48" />
            ) : (
              <div className="space-y-2">
                <Select value={preferredModel} onValueChange={setPreferredModel}>
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Auto (server default)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Auto (server default)</SelectItem>
                    {safeModels.map((m) => (
                      <SelectItem key={m.name} value={m.name}>
                        {m.name}
                        {m.size && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            {(m.size / 1e9).toFixed(1)}GB
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {safeModels.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {safeModels.length} model{safeModels.length !== 1 ? "s" : ""} available
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Voice */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mic size={18} className="text-rose-400" />
              Voice Assistant
            </CardTitle>
            <CardDescription>Enable voice input and responses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Switch
                checked={voiceEnabled}
                onCheckedChange={setVoiceEnabled}
                id="voice-toggle"
              />
              <Label htmlFor="voice-toggle" className="cursor-pointer">
                {voiceEnabled ? "Voice enabled" : "Voice disabled"}
              </Label>
              {voiceEnabled && (
                <Badge variant="outline" className="text-rose-400 border-rose-500/30 text-xs">
                  Beta
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* AI Provider */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot size={18} className="text-cyan-400" />
              AI Provider
            </CardTitle>
            <CardDescription>Choose your AI service provider</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={aiProvider} onValueChange={(value: "ollama" | "openai" | "anthropic") => setAiProvider(value)}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ollama">Ollama (Local)</SelectItem>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
              </SelectContent>
            </Select>

            {aiProvider === "openai" && (
              <div className="space-y-2">
                <Label htmlFor="openai-key" className="flex items-center gap-2">
                  <Key size={14} />
                  OpenAI API Key
                </Label>
                <Input
                  id="openai-key"
                  type="password"
                  placeholder="sk-..."
                  value={openaiApiKey}
                  onChange={(e) => setOpenaiApiKey(e.target.value)}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Your API key is stored securely and used only for OpenAI requests.
                </p>
              </div>
            )}

            {aiProvider === "anthropic" && (
              <div className="space-y-2">
                <Label htmlFor="anthropic-key" className="flex items-center gap-2">
                  <Key size={14} />
                  Anthropic API Key
                </Label>
                <Input
                  id="anthropic-key"
                  type="password"
                  placeholder="sk-ant-..."
                  value={anthropicApiKey}
                  onChange={(e) => setAnthropicApiKey(e.target.value)}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Your API key is stored securely and used only for Anthropic requests.
                </p>
              </div>
            )}

            {aiProvider === "ollama" && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle size={16} className="text-green-400" />
                Using local Ollama - no API key required
              </div>
            )}
          </CardContent>
        </Card>

        {/* Save */}
        <Button
          onClick={handleSave}
          disabled={updateProfile.isPending || saved}
          size="lg"
          className="gap-2"
        >
          {updateProfile.isPending ? (
            <Loader2 size={18} className="animate-spin" />
          ) : saved ? (
            <CheckCircle size={18} />
          ) : (
            <Save size={18} />
          )}
          {saved ? "Settings Saved!" : "Save Settings"}
        </Button>
      </div>
    </AppLayout>
  );
}
