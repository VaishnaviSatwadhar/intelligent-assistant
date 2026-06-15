import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useGetUserProfile,
  useUpdateUserProfile,
  getGetUserProfileQueryKey,
} from "@workspace/api-client-react";
import { useAuth } from "@workspace/replit-auth-web";
import { useQueryClient } from "@tanstack/react-query";
import { User, Save, Loader2, CheckCircle } from "lucide-react";

export default function ProfilePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: profile, isLoading } = useGetUserProfile();
  const updateProfile = useUpdateUserProfile();

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName ?? "");
      setBio(profile.bio ?? "");
    }
  }, [profile]);

  const handleSave = () => {
    updateProfile.mutate(
      { data: { displayName: displayName || undefined, bio: bio || undefined } },
      {
        onSuccess: () => {
          setSaved(true);
          queryClient.invalidateQueries({ queryKey: getGetUserProfileQueryKey() });
          setTimeout(() => setSaved(false), 2000);
        },
      }
    );
  };

  const initials =
    (user?.firstName?.[0] ?? "") + (user?.lastName?.[0] ?? user?.email?.[0] ?? "U");

  return (
    <AppLayout>
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <User size={22} className="text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Profile</h1>
            <p className="text-sm text-muted-foreground">Manage your account information</p>
          </div>
        </div>

        {/* Avatar + Replit info */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-5">
              <Avatar className="w-16 h-16">
                <AvatarImage src={user?.profileImageUrl ?? undefined} />
                <AvatarFallback className="text-xl font-bold bg-primary/20 text-primary">
                  {initials.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-lg font-semibold">
                  {user?.firstName} {user?.lastName}
                </h2>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
                <Badge variant="outline" className="mt-1 text-xs">
                  Replit Account
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Editable fields */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Details</CardTitle>
            <CardDescription>Update your display name and bio</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label>Display Name</Label>
                  <Input
                    placeholder="Your display name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Bio</Label>
                  <Textarea
                    placeholder="Tell us a bit about yourself..."
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={3}
                  />
                </div>
                <Button
                  onClick={handleSave}
                  disabled={updateProfile.isPending || saved}
                  className="w-full sm:w-auto gap-2"
                >
                  {updateProfile.isPending ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : saved ? (
                    <CheckCircle size={16} />
                  ) : (
                    <Save size={16} />
                  )}
                  {saved ? "Saved!" : "Save Changes"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Stats */}
        {profile && (
          <Card>
            <CardHeader>
              <CardTitle>Account Info</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-muted-foreground">Language</dt>
                  <dd className="font-medium mt-0.5 capitalize">
                    {profile.preferredLanguage === "en"
                      ? "English"
                      : profile.preferredLanguage === "hi"
                      ? "हिंदी"
                      : "मराठी"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Theme</dt>
                  <dd className="font-medium mt-0.5 capitalize">
                    {profile.theme ?? "system"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Voice</dt>
                  <dd className="font-medium mt-0.5">
                    {profile.voiceEnabled ? "Enabled" : "Disabled"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Preferred Model</dt>
                  <dd className="font-medium mt-0.5">
                    {profile.preferredModel ?? "Auto"}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
