import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { bookmarksTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateBookmarkBody, DeleteBookmarkParams } from "@workspace/api-zod";

const bookmarksRouter: IRouter = Router();

bookmarksRouter.get("/bookmarks", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const userId = req.user!.id;
  const bookmarks = await db
    .select()
    .from(bookmarksTable)
    .where(eq(bookmarksTable.userId, userId))
    .orderBy(bookmarksTable.createdAt);

  res.json(bookmarks);
});

bookmarksRouter.post("/bookmarks", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const parsed = CreateBookmarkBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const userId = req.user!.id;

  const [bookmark] = await db
    .insert(bookmarksTable)
    .values({ userId, ...parsed.data })
    .returning();

  res.status(201).json(bookmark);
});

bookmarksRouter.delete("/bookmarks/:id", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const parsed = DeleteBookmarkParams.safeParse({ id: parseInt(req.params.id as string) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const userId = req.user!.id;

  const [bookmark] = await db
    .select()
    .from(bookmarksTable)
    .where(eq(bookmarksTable.id, parsed.data.id));

  if (!bookmark || bookmark.userId !== userId) {
    res.status(404).json({ error: "Bookmark not found" });
    return;
  }

  await db.delete(bookmarksTable).where(eq(bookmarksTable.id, parsed.data.id));
  res.json({ success: true });
});

export default bookmarksRouter;
