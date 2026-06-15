import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { userProfilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { UpdateUserProfileBody } from "@workspace/api-zod";

const userRouter: IRouter = Router();

userRouter.get("/user/profile", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const userId = req.user!.id;

  let [profile] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.userId, userId));

  if (!profile) {
    [profile] = await db
      .insert(userProfilesTable)
      .values({
        userId,
        displayName: req.user!.firstName || null,
        preferredLanguage: "en",
        theme: "system",
        preferredModel: "llama3.2",
        voiceEnabled: false,
      })
      .returning();
  }

  res.json({
    id: userId,
    displayName: profile.displayName,
    preferredLanguage: profile.preferredLanguage,
    theme: profile.theme,
    preferredModel: profile.preferredModel,
    voiceEnabled: profile.voiceEnabled,
    bio: profile.bio,
    profileImageUrl: req.user!.profileImageUrl,
  });
});

userRouter.patch("/user/profile", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const parsed = UpdateUserProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const userId = req.user!.id;

  const updates: Partial<typeof userProfilesTable.$inferInsert> = {};
  if (parsed.data.displayName !== undefined) updates.displayName = parsed.data.displayName;
  if (parsed.data.preferredLanguage !== undefined) updates.preferredLanguage = parsed.data.preferredLanguage;
  if (parsed.data.theme !== undefined) updates.theme = parsed.data.theme;
  if (parsed.data.preferredModel !== undefined) updates.preferredModel = parsed.data.preferredModel;
  if (parsed.data.voiceEnabled !== undefined) updates.voiceEnabled = parsed.data.voiceEnabled;
  if (parsed.data.bio !== undefined) updates.bio = parsed.data.bio;

  let [profile] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.userId, userId));

  if (!profile) {
    [profile] = await db
      .insert(userProfilesTable)
      .values({ userId, ...updates })
      .returning();
  } else {
    [profile] = await db
      .update(userProfilesTable)
      .set(updates)
      .where(eq(userProfilesTable.userId, userId))
      .returning();
  }

  res.json({
    id: userId,
    displayName: profile.displayName,
    preferredLanguage: profile.preferredLanguage,
    theme: profile.theme,
    preferredModel: profile.preferredModel,
    voiceEnabled: profile.voiceEnabled,
    bio: profile.bio,
    profileImageUrl: req.user!.profileImageUrl,
  });
});

export default userRouter;
