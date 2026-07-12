import { Router, type IRouter } from "express";
import fs from "fs";
import path from "path";
import { db } from "@workspace/db";
import {
  conversationsTable,
  messagesTable,
  userProfilesTable,
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
import { requireAuth } from "../middlewares/requireAuth";

const OLLAMA_BASE_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const DEFAULT_OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const DEFAULT_ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";
const DEFAULT_GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

const SYSTEM_PROMPTS: Record<string, string> = {
  general: "You are SmartAI Assistant, a helpful, intelligent, and friendly AI assistant. Provide clear, accurate, and thoughtful responses.",
  learning: "You are SmartAI Study Assistant, an expert educational tutor. Help students understand concepts clearly, create summaries, generate quiz questions, and explain topics at appropriate levels. Use examples and analogies to make learning easier.",
  career: "You are SmartAI Career Coach, an expert career guidance counselor. Help with resume improvement, skill recommendations, learning roadmaps, project ideas, interview preparation, and career path planning. Give actionable, practical advice.",
  document: "You are SmartAI Document Analyzer, an expert at analyzing and extracting insights from documents. Help users understand documents, extract key points, generate questions, and summarize content.",
  voice: "You are SmartAI Voice Assistant, a concise and clear assistant optimized for voice interaction. Keep responses brief, clear, and easy to understand when spoken aloud.",
  english_teacher: "You are SmartAI English Teacher, an expert at teaching English communication, grammar, and pronunciation. You are roleplaying a specific scenario with the user (provided in the context). Act out the scenario naturally in your response.\n\nCRITICAL: At the end of EVERY response, you MUST append a structured feedback section analyzing the user's previous message. Format it as follows:\n\n[Feedback]\n- Grammar: (Correct any mistakes or say 'Good')\n- Vocabulary: (Suggest better words or phrases)\n- Fluency: (Give a tip on sounding more natural)",
};

const LANGUAGE_PREFIXES: Record<string, string> = {
  en: "",
  hi: "Please respond in Hindi (हिंदी में उत्तर दें). ",
  mr: "Please respond in Marathi (मराठीत उत्तर द्या). ",
};


function getFileBase64(url: string): string | null {
  if (!url.startsWith("/uploads/")) return null;
  try {
    const filename = url.replace("/uploads/", "");
    const filepath = path.join(process.cwd(), "public", "uploads", filename);
    const data = fs.readFileSync(filepath);
    const ext = path.extname(filename).toLowerCase();
    let mimeType = "application/octet-stream";
    if (ext === ".png") mimeType = "image/png";
    else if (ext === ".jpg" || ext === ".jpeg") mimeType = "image/jpeg";
    else if (ext === ".webp") mimeType = "image/webp";
    else if (ext === ".gif") mimeType = "image/gif";
    return `data:${mimeType};base64,${data.toString("base64")}`;
  } catch (err) {
    return null;
  }
}

async function callOllama(
  messages: Array<{ role: string; content: string; attachments?: string[] | null }>,
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

async function callOpenAI(
  messages: Array<{ role: string; content: string; attachments?: string[] | null }>,
  model: string,
  apiKey: string
): Promise<{ content: string; tokenUsage: number }> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || "gpt-4o-mini",
      messages: messages.map(m => {
        if (!m.attachments || m.attachments.length === 0) return { role: m.role, content: m.content };
        const content = [{ type: "text", text: m.content }] as any[];
        for (const url of m.attachments) {
          const b64 = getFileBase64(url);
          if (b64) content.push({ type: "image_url", image_url: { url: b64 } });
        }
        return { role: m.role, content };
      }),
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI error: ${response.status} ${error}`);
  }

  const data = await response.json() as any;
  return { 
    content: data.choices?.[0]?.message?.content || "", 
    tokenUsage: data.usage?.total_tokens || 0 
  };
}

async function callAnthropic(
  messages: Array<{ role: string; content: string; attachments?: string[] | null }>,
  model: string,
  apiKey: string
): Promise<{ content: string; tokenUsage: number }> {
  const systemMessage = messages.find(m => m.role === "system");
  const userMessages = messages.filter(m => m.role !== "system");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: model || "claude-3-5-sonnet-20241022",
      max_tokens: 4096,
      system: systemMessage?.content || "",
      messages: userMessages.map(m => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      })),
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic error: ${response.status} ${error}`);
  }

  const data = await response.json() as any;
  const inputTokens = data.usage?.input_tokens || 0;
  const outputTokens = data.usage?.output_tokens || 0;
  return { 
    content: data.content?.[0]?.text || "", 
    tokenUsage: inputTokens + outputTokens 
  };
}

async function callGemini(
  messages: Array<{ role: string; content: string; attachments?: string[] | null }>,
  model: string,
  apiKey: string
): Promise<{ content: string; tokenUsage: number }> {
  const systemMessage = messages.find(m => m.role === "system");
  const userMessages = messages.filter(m => m.role !== "system");

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model || "gemini-1.5-flash"}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: userMessages.map(m => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
      systemInstruction: systemMessage?.content ? {
        parts: [{ text: systemMessage.content }],
      } : undefined,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini error: ${response.status} ${error}`);
  }

  const data = await response.json() as any;
  return {
    content: data.candidates?.[0]?.content?.parts?.[0]?.text || "",
    tokenUsage: data.usageMetadata?.totalTokenCount || 0
  };
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
    english_teacher: [
      "How do I say this more naturally?",
      "Can we practice a conversation about travel?",
      "Could you correct my grammar?",
    ],
  };
  return (suggestions[mode] || suggestions.general).slice(0, 3);
}

const chatRouter: IRouter = Router();

chatRouter.use(requireAuth);

chatRouter.get("/conversations", async (req, res): Promise<void> => {
  const userId = req.userId!;

  const convs = await db
    .select()
    .from(conversationsTable)
    .where(eq(conversationsTable.userId, userId))
    .orderBy(desc(conversationsTable.updatedAt));

  res.json(convs);
});

chatRouter.post("/conversations", async (req, res): Promise<void> => {
  const parsed = CreateConversationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const userId = req.userId!;
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
  const parsed = GetConversationParams.safeParse({ id: parseInt(req.params.id as string) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const userId = req.userId!;

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
  const userId = req.userId!;

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
  const parsed = DeleteConversationParams.safeParse({ id: parseInt(req.params.id as string) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const userId = req.userId!;

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
  const parsed = SendChatMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const userId = req.userId!;
  const { content, conversationId, mode = "general", model = "llama3.2", language = "en", attachments } = parsed.data;

  // Get user profile to determine AI provider and API keys
  const [userProfile] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.userId, userId));

  const aiProvider = userProfile?.aiProvider || (DEFAULT_OPENAI_API_KEY ? "openai" : "ollama");
  const openaiKey = userProfile?.openaiApiKey || DEFAULT_OPENAI_API_KEY;
  const anthropicKey = userProfile?.anthropicApiKey || DEFAULT_ANTHROPIC_API_KEY;
  const geminiKey = userProfile?.geminiApiKey || DEFAULT_GEMINI_API_KEY;

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
    attachments,
  });

  const history = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.conversationId, convId))
    .orderBy(messagesTable.createdAt);

  const languagePrefix = LANGUAGE_PREFIXES[language] || "";
  const systemPrompt = languagePrefix + SYSTEM_PROMPTS[mode] || SYSTEM_PROMPTS.general;

  const messages = [
    { role: "system", content: systemPrompt },
    ...history.map((m) => ({ role: m.role, content: m.content, attachments: m.attachments as string[] | null })),
  ];

  let aiContent = "";
  let tokenUsage = 0;
  try {
    switch (aiProvider) {
      case "openai":
        if (!openaiKey) {
          throw new Error("OpenAI API key not configured");
        }
        const oaiRes = await callOpenAI(messages, model, openaiKey);
        aiContent = oaiRes.content;
        tokenUsage = oaiRes.tokenUsage;
        break;
      case "anthropic":
        if (!anthropicKey) {
          throw new Error("Anthropic API key not configured");
        }
        const anthRes = await callAnthropic(messages, model, anthropicKey);
        aiContent = anthRes.content;
        tokenUsage = anthRes.tokenUsage;
        break;
      case "ollama":
      default:
        try {
          aiContent = await callOllama(messages, model);
          tokenUsage = 0; // Local LLM doesn't return usage in this simple fetch
        } catch (err) {
          req.log.warn({ err }, "Ollama unavailable, using mock response");
          aiContent = `I am a mock assistant. I received your message: "${content}".\n\nTo get real answers, please configure an AI provider (OpenAI/Anthropic/Gemini) in your settings or start a local Ollama instance.`;
        }
        break;
    }
  } catch (err) {
    req.log.error({ err, provider: aiProvider }, "AI request failed");
    res.status(503).json({ 
      error: `AI service unavailable for ${aiProvider}. ${err instanceof Error ? err.message : ''}` 
    });
    return;
  }

  const [aiMsg] = await db
    .insert(messagesTable)
    .values({
      conversationId: convId,
      role: "assistant",
      content: aiContent,
      metadata: tokenUsage > 0 ? JSON.stringify({ tokenUsage }) : null,
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
    provider: aiProvider,
    metadata: tokenUsage > 0 ? JSON.stringify({ tokenUsage }) : null,
  });
});

export default chatRouter;
