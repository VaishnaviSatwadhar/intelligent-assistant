import { Router, type IRouter } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { db } from "@workspace/db";
import { documentsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  GetDocumentParams,
  DeleteDocumentParams,
  AnalyzeDocumentParams,
  AnalyzeDocumentBody,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";

const workspaceRoot = process.cwd().endsWith(path.join("artifacts", "api-server"))
  ? path.resolve(process.cwd(), "../..")
  : process.cwd();

const uploadsDir = path.resolve(workspaceRoot, "artifacts/api-server/uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [".pdf", ".txt", ".docx", ".doc", ".md"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF, DOCX, TXT, and MD files are allowed"));
    }
  },
});

const OLLAMA_BASE_URL = process.env.OLLAMA_URL || "http://localhost:11434";

async function callOllama(prompt: string, model: string = "llama3.2"): Promise<string> {
  const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      prompt,
      stream: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama error: ${response.status}`);
  }

  const data = await response.json() as { response?: string; error?: string };
  if (data.error) throw new Error(data.error);
  return data.response || "";
}

async function extractText(filePath: string, ext: string): Promise<string> {
  if (ext === ".txt" || ext === ".md") {
    return fs.readFileSync(filePath, "utf-8");
  }
  if (ext === ".pdf") {
    try {
      const pdfParseModule = await import("pdf-parse");
      const pdfParse = (pdfParseModule as any).default || pdfParseModule;
      const buffer = fs.readFileSync(filePath);
      const parsed = await (pdfParse as any)(buffer);
      return parsed.text;
    } catch {
      return fs.readFileSync(filePath, "utf-8").replace(/[^\x20-\x7E\n]/g, " ");
    }
  }
  return "Document content could not be extracted from this file type. Please use TXT or PDF format for best results.";
}

const documentsRouter: IRouter = Router();

documentsRouter.get("/documents", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const docs = await db
    .select({
      id: documentsTable.id,
      name: documentsTable.name,
      fileType: documentsTable.fileType,
      fileSize: documentsTable.fileSize,
      analyzed: documentsTable.analyzed,
      summary: documentsTable.summary,
      createdAt: documentsTable.createdAt,
    })
    .from(documentsTable)
    .where(eq(documentsTable.userId, userId))
    .orderBy(documentsTable.createdAt);

  res.json(docs);
});

documentsRouter.post("/documents", requireAuth, upload.single("file"), async (req, res): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }

  const userId = req.userId!;
  const ext = path.extname(req.file.originalname).toLowerCase().replace(".", "");
  const content = await extractText(req.file.path, "." + ext);

  const [doc] = await db
    .insert(documentsTable)
    .values({
      userId,
      name: req.file.originalname,
      fileType: ext,
      fileSize: req.file.size,
      content,
      analyzed: false,
    })
    .returning({
      id: documentsTable.id,
      name: documentsTable.name,
      fileType: documentsTable.fileType,
      fileSize: documentsTable.fileSize,
      analyzed: documentsTable.analyzed,
      summary: documentsTable.summary,
      createdAt: documentsTable.createdAt,
    });

  res.status(201).json(doc);
});

documentsRouter.get("/documents/:id", requireAuth, async (req, res): Promise<void> => {
  const parsed = GetDocumentParams.safeParse({ id: parseInt(req.params.id as string) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const userId = req.userId!;

  const [doc] = await db
    .select({
      id: documentsTable.id,
      name: documentsTable.name,
      fileType: documentsTable.fileType,
      fileSize: documentsTable.fileSize,
      analyzed: documentsTable.analyzed,
      summary: documentsTable.summary,
      createdAt: documentsTable.createdAt,
    })
    .from(documentsTable)
    .where(eq(documentsTable.id, parsed.data.id));

  if (!doc || (await db.select({ userId: documentsTable.userId }).from(documentsTable).where(eq(documentsTable.id, parsed.data.id)))[0]?.userId !== userId) {
    res.status(404).json({ error: "Document not found" });
    return;
  }

  res.json(doc);
});

documentsRouter.delete("/documents/:id", requireAuth, async (req, res): Promise<void> => {
  const parsed = DeleteDocumentParams.safeParse({ id: parseInt(req.params.id as string) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const userId = req.userId!;

  const [doc] = await db
    .select()
    .from(documentsTable)
    .where(eq(documentsTable.id, parsed.data.id));

  if (!doc || doc.userId !== userId) {
    res.status(404).json({ error: "Document not found" });
    return;
  }

  await db.delete(documentsTable).where(eq(documentsTable.id, parsed.data.id));
  res.json({ success: true });
});

documentsRouter.post("/documents/:id/analyze", requireAuth, async (req, res): Promise<void> => {
  const idParsed = AnalyzeDocumentParams.safeParse({ id: parseInt(req.params.id as string) });
  if (!idParsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const bodyParsed = AnalyzeDocumentBody.safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(400).json({ error: bodyParsed.error.message });
    return;
  }

  const userId = req.userId!;
  const [doc] = await db
    .select()
    .from(documentsTable)
    .where(eq(documentsTable.id, idParsed.data.id));

  if (!doc || doc.userId !== userId) {
    res.status(404).json({ error: "Document not found" });
    return;
  }

  const { analysisType } = bodyParsed.data;
  const truncatedContent = doc.content.slice(0, 6000);

  const prompts: Record<string, string> = {
    summary: `Summarize the following document in 3-5 paragraphs:\n\n${truncatedContent}`,
    keyPoints: `Extract 5-10 key points from this document as a numbered list:\n\n${truncatedContent}`,
    qa: `Generate 5 question-answer pairs based on this document. Format as:\nQ: [question]\nA: [answer]\n\n${truncatedContent}`,
    quiz: `Create a 5-question multiple choice quiz based on this document. Format each question with 4 options (A, B, C, D) and mark the correct answer.\n\n${truncatedContent}`,
  };

  const prompt = prompts[analysisType] || prompts.summary;

  let result: string;
  try {
    result = await callOllama(prompt);
  } catch (err) {
    req.log.error({ err }, "Ollama analysis failed");
    res.status(503).json({ error: "AI service unavailable." });
    return;
  }

  await db
    .update(documentsTable)
    .set({ analyzed: true, summary: analysisType === "summary" ? result : doc.summary })
    .where(eq(documentsTable.id, idParsed.data.id));

  let qaItems: Array<{ question: string; answer: string }> = [];
  if (analysisType === "qa") {
    const lines = result.split("\n");
    let currentQ = "";
    for (const line of lines) {
      if (line.startsWith("Q:")) {
        currentQ = line.replace("Q:", "").trim();
      } else if (line.startsWith("A:") && currentQ) {
        qaItems.push({ question: currentQ, answer: line.replace("A:", "").trim() });
        currentQ = "";
      }
    }
  }

  res.json({
    analysisType,
    result,
    documentId: idParsed.data.id,
    qaItems: qaItems.length ? qaItems : undefined,
  });
});

export default documentsRouter;
