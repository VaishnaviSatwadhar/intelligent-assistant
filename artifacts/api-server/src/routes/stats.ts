import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  conversationsTable,
  messagesTable,
  documentsTable,
  bookmarksTable,
} from "@workspace/db";
import { eq, count, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const OLLAMA_BASE_URL = process.env.OLLAMA_URL || "http://localhost:11434";

const statsRouter: IRouter = Router();

statsRouter.get("/stats", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;

  const [convCount] = await db
    .select({ count: count() })
    .from(conversationsTable)
    .where(eq(conversationsTable.userId, userId));

  const [msgCount] = await db
    .select({ count: count() })
    .from(messagesTable)
    .innerJoin(conversationsTable, eq(messagesTable.conversationId, conversationsTable.id))
    .where(eq(conversationsTable.userId, userId));

  const [docCount] = await db
    .select({ count: count() })
    .from(documentsTable)
    .where(eq(documentsTable.userId, userId));

  const [bookmarkedCount] = await db
    .select({ count: count() })
    .from(conversationsTable)
    .where(
      sql`${conversationsTable.userId} = ${userId} AND ${conversationsTable.bookmarked} = true`
    );

  const modeCountRows = await db
    .select({
      mode: conversationsTable.mode,
      count: count(),
    })
    .from(conversationsTable)
    .where(eq(conversationsTable.userId, userId))
    .groupBy(conversationsTable.mode);

  const recentConvs = await db
    .select({
      title: conversationsTable.title,
      createdAt: conversationsTable.createdAt,
    })
    .from(conversationsTable)
    .where(eq(conversationsTable.userId, userId))
    .orderBy(sql`${conversationsTable.updatedAt} DESC`)
    .limit(5);

  const recentDocs = await db
    .select({
      name: documentsTable.name,
      createdAt: documentsTable.createdAt,
    })
    .from(documentsTable)
    .where(eq(documentsTable.userId, userId))
    .orderBy(sql`${documentsTable.createdAt} DESC`)
    .limit(3);

  const recentActivity = [
    ...recentConvs.map((c) => ({
      type: "conversation" as const,
      title: c.title,
      createdAt: c.createdAt.toISOString(),
    })),
    ...recentDocs.map((d) => ({
      type: "document" as const,
      title: d.name,
      createdAt: d.createdAt.toISOString(),
    })),
  ]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  res.json({
    totalConversations: convCount?.count || 0,
    totalMessages: msgCount?.count || 0,
    totalDocuments: docCount?.count || 0,
    bookmarkedConversations: bookmarkedCount?.count || 0,
    conversationsByMode: modeCountRows.map((r) => ({ mode: r.mode, count: r.count })),
    recentActivity,
  });
});

statsRouter.get("/models", async (req, res): Promise<void> => {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
    if (!response.ok) {
      throw new Error(`Ollama error: ${response.status}`);
    }
    const data = await response.json() as { models?: Array<{ name: string; size?: number; digest?: string }> };
    const models = (data.models || []).map((m) => ({
      name: m.name,
      size: m.size || null,
      digest: m.digest || null,
    }));
    res.json(models);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch Ollama models");
    res.status(503).json({ error: "Ollama is not running. Please start Ollama with a Llama model." });
  }
});

export default statsRouter;
