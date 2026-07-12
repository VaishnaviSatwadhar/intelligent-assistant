const fs = require("fs");
const path = require("path");

const chatPath = path.join(__dirname, "api-server/src/routes/chat.ts");
let content = fs.readFileSync(chatPath, "utf8");

// 1. Add imports
content = content.replace('import { Router, type IRouter } from "express";', 'import { Router, type IRouter } from "express";\nimport fs from "fs";\nimport path from "path";');

// 2. Add getFileBase64
const base64Func = `
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
    return \`data:\${mimeType};base64,\${data.toString("base64")}\`;
  } catch (err) {
    return null;
  }
}

`;
content = content.replace('async function callOllama(', base64Func + 'async function callOllama(');

// 3. Update message types
content = content.replace(/messages: Array<\{ role: string; content: string \}>,/g, 'messages: Array<{ role: string; content: string; attachments?: string[] | null }>,');

// 4. Update callOpenAI body
const openaiTarget = `    body: JSON.stringify({
      model: model || "gpt-4o-mini",
      messages,
    }),`;
const openaiReplacement = `    body: JSON.stringify({
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
    }),`;
content = content.replace(openaiTarget, openaiReplacement);

// 5. Update POST /chat parsing
content = content.replace(
  'const { content, conversationId, mode = "general", model = "llama3.2", language = "en" } = parsed.data;',
  'const { content, conversationId, mode = "general", model = "llama3.2", language = "en", attachments } = parsed.data;'
);

// 6. Update insert
const insertTarget = `  await db.insert(messagesTable).values({
    conversationId: convId,
    role: "user",
    content,
  });`;
const insertReplacement = `  await db.insert(messagesTable).values({
    conversationId: convId,
    role: "user",
    content,
    attachments,
  });`;
content = content.replace(insertTarget, insertReplacement);

// 7. Update history mapping
const mapTarget = '...history.map((m) => ({ role: m.role, content: m.content })),';
const mapReplacement = '...history.map((m) => ({ role: m.role, content: m.content, attachments: m.attachments as string[] | null })),';
content = content.replace(mapTarget, mapReplacement);

fs.writeFileSync(chatPath, content);
console.log("Patched chat.ts");
