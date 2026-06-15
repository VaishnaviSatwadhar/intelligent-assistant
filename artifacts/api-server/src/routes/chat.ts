import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  conversationsTable,
  messagesTable,
} from "@workspace/db";
import { eq, desc, sql, count } from "drizzle-orm";
import {
  SendChatMessageBody,
  CreateConversationBody,
  UpdateConversationBody,
  GetConversationParams,
  DeleteConversationParams,
  UpdateConversationParams,
} from "@workspace/api-zod";
import { logger } from "../lib/logger";

const OLLAMA_BASE_URL = process.env.OLLAMA_URL || "http://localhost:11434";

const SYSTEM_PROMPTS: Record<string, string> = {
  general: "You are SmartAI Assistant, a helpful, intelligent, and friendly AI assistant. Provide clear, accurate, and thoughtful responses.",
  learning: "You are SmartAI Study Assistant, an expert educational tutor. Help students understand concepts clearly, create summaries, generate quiz questions, and explain topics at appropriate levels. Use examples and analogies to make learning easier.",
  career: "You are SmartAI Career Coach, an expert career guidance counselor. Help with resume improvement, skill recommendations, learning roadmaps, project ideas, interview preparation, and career path planning. Give actionable, practical advice.",
  document: "You are SmartAI Document Analyzer, an expert at analyzing and extracting insights from documents. Help users understand documents, extract key points, generate questions, and summarize content.",
  voice: "You are SmartAI Voice Assistant, a concise and clear assistant optimized for voice interaction. Keep responses brief, clear, and easy to understand when spoken aloud.",
};

const LANGUAGE_PREFIXES: Record<string, string> = {
  en: "",
  hi: "Please respond in Hindi (हिंदी में उत्तर दें). ",
  mr: "Please respond in Marathi (मराठीत उत्तर द्या). ",
};

async function callOllama(
  messages: Array<{ role: string; content: string }>,
  model: string
): Promise<string> {
  const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages,
      stream: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as { message?: { content: string }; error?: string };
  if (data.error) throw new Error(data.error);
  return data.message?.content || "";
}

function generateSuggestedQuestions(content: string, mode: string): string[] {
  const suggestions: Record<string, string[]> = {
    learning: [
      "Can you explain this concept with an example?",
      "What are the key takeaways from this?",
      "Can you create a quiz about this topic?",
    ],
    career: [
      "What skills should I develop next?",
      "How can I improve my resume for this?",
      "What projects would showcase these skills?",
    ],
    document: [
      "What are the main points of this document?",
      "Can you summarize this in bullet points?",
      "What questions does this document answer?",
    ],
    general: [
      "Can you elaborate on that?",
      "What are some practical examples?",
      "Can you simplify this explanation?",
    ],
    voice: [
      "Tell me more about this.",
      "Give me a quick summary.",
      "What should I know next?",
    ],
  };
  return (suggestions[mode] || suggestions.general).slice(0, 3);
}

const chatRouter: IRouter = Router();

chatRouter.get("/conversations", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const userId = req.user!.id;

  const messageCountSq = db
    .select({
      conversationId: messagesTable.conversationId,
      count: count().as("count"),
    })
    .from(messagesTable)
    .groupBy(messagesTable.conversationId)
    .as("msg_counts");

  const lastMsgSq = db
    .select({
      conversationId: messagesTable.conversationId,
      lastContent: sql<string>`(array_agg(${messagesTable.content} ORDER BY ${messagesTable.createdAt} DESC))[1]`.as("last_content"),
    })
    .from(messagesTable)
    .groupBy(messagesTable.conversationId)
    .as("last_msgs");

  const convs = await db
    .select({
      id: conversationsTable.id,
      title: conversationsTable.title,
      mode: conversationsTable.mode,
      bookmarked: conversationsTable.bookmarked,
      createdAt: conversationsTable.createdAt,
      updatedAt: conversationsTable.updatedAt,
      messageCount: sql<number>`COALESCE(${messageCountSq.count}, 0)`,
      lastMessage: sql<string | null>`${lastMsgSq.lastContent}`,
    })
    .from(conversationsTable)
    .leftJoin(messageCountSq, eq(conversationsTable.id, messageCountSq.conversationId))
    .leftJoin(lastMsgSq, eq(conversationsTable.id, lastMsgSq.conversationId))
    .where(eq(conversationsTable.userId, userId))
    .orderBy(desc(conversationsTable.updatedAt));

  res.json(convs);
});

chatRouter.post("/conversations", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const parsed = CreateConversationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const userId = req.user!.id;
  const { title, mode } = parsed.data;

  const [conv] = await db
    .insert(conversationsTable)
    .values({ userId, title, mode: mode || "general" })
    .returning();

  res.status(201).json({
    ...conv,
    messageCount: 0,
    lastMessage: null,
  });
});

chatRouter.get("/conversations/:id", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const parsed = GetConversationParams.safeParse({ id: parseInt(req.params.id as string) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const userId = req.user!.id;

  const [conv] = await db
    .select()
    .from(conversationsTable)
    .where(eq(conversationsTable.id, parsed.data.id));

  if (!conv || conv.userId !== userId) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  const messages = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.conversationId, conv.id))
    .orderBy(messagesTable.createdAt);

  res.json({ ...conv, messages });
});

chatRouter.patch("/conversations/:id", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const idParsed = UpdateConversationParams.safeParse({ id: parseInt(req.params.id as string) });
  if (!idParsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const parsed = UpdateConversationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const userId = req.user!.id;

  const [conv] = await db
    .select()
    .from(conversationsTable)
    .where(eq(conversationsTable.id, idParsed.data.id));

  if (!conv || conv.userId !== userId) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  const updates: Partial<typeof conversationsTable.$inferInsert> = {};
  if (parsed.data.title !== undefined) updates.title = parsed.data.title;
  if (parsed.data.bookmarked !== undefined) updates.bookmarked = parsed.data.bookmarked;

  const [updated] = await db
    .update(conversationsTable)
    .set(updates)
    .where(eq(conversationsTable.id, idParsed.data.id))
    .returning();

  const msgCount = await db
    .select({ count: count() })
    .from(messagesTable)
    .where(eq(messagesTable.conversationId, updated.id));

  res.json({ ...updated, messageCount: msgCount[0]?.count || 0, lastMessage: null });
});

chatRouter.delete("/conversations/:id", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const parsed = DeleteConversationParams.safeParse({ id: parseInt(req.params.id as string) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const userId = req.user!.id;

  const [conv] = await db
    .select()
    .from(conversationsTable)
    .where(eq(conversationsTable.id, parsed.data.id));

  if (!conv || conv.userId !== userId) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  await db.delete(conversationsTable).where(eq(conversationsTable.id, parsed.data.id));
  res.json({ success: true });
});

chatRouter.post("/chat", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const parsed = SendChatMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const userId = req.user!.id;
  const { content, conversationId, mode = "general", model = "llama3.2", language = "en" } = parsed.data;

  let convId = conversationId;

  if (!convId) {
    const title = content.length > 50 ? content.slice(0, 50) + "..." : content;
    const [newConv] = await db
      .insert(conversationsTable)
      .values({ userId, title, mode })
      .returning();
    convId = newConv.id;
  }

  await db.insert(messagesTable).values({
    conversationId: convId,
    role: "user",
    content,
  });

  const history = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.conversationId, convId))
    .orderBy(messagesTable.createdAt);

  const languagePrefix = LANGUAGE_PREFIXES[language] || "";
  const systemPrompt = languagePrefix + SYSTEM_PROMPTS[mode] || SYSTEM_PROMPTS.general;

  const ollamaMessages = [
    { role: "system", content: systemPrompt },
    ...history.map((m) => ({ role: m.role, content: m.content })),
  ];

  let aiContent: string;
  try {
    aiContent = await callOllama(ollamaMessages, model);
  } catch (err) {
    req.log.error({ err }, "Ollama request failed");
    res.status(503).json({ error: "AI service unavailable. Please ensure Ollama is running with a Llama model." });
    return;
  }

  const [aiMsg] = await db
    .insert(messagesTable)
    .values({
      conversationId: convId,
      role: "assistant",
      content: aiContent,
    })
    .returning();

  await db
    .update(conversationsTable)
    .set({ updatedAt: new Date() })
    .where(eq(conversationsTable.id, convId));

  const suggestedQuestions = generateSuggestedQuestions(aiContent, mode);

  res.json({
    content: aiContent,
    conversationId: convId,
    messageId: aiMsg.id,
    suggestedQuestions,
    model,
  });
});

export default chatRouter;
