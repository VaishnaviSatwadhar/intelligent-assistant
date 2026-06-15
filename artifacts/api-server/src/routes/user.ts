import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { userProfilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { UpdateUserProfileBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";

const userRouter: IRouter = Router();

userRouter.use(requireAuth);

userRouter.get("/user/profile", async (req, res): Promise<void> => {
  const userId = req.userId!;
  const userRecord = req.userRecord!;

  let [profile] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.userId, userId));

  if (!profile) {
    [profile] = await db
      .insert(userProfilesTable)
      .values({
        userId,
        displayName: userRecord.firstName || null,
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
    profileImageUrl: userRecord.profileImageUrl,
  });
});

userRouter.patch("/user/profile", async (req, res): Promise<void> => {
  const parsed = UpdateUserProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const userId = req.userId!;
  const userRecord = req.userRecord!;

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
    profileImageUrl: userRecord.profileImageUrl,
  });
});

export default userRouter;
