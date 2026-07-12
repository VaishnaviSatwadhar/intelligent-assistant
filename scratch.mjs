import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

async function test() {
  const apiKey = process.env.GEMINI_API_KEY;
  console.log("Key exists:", !!apiKey);
  
  if (!apiKey) return;

  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      model: "gemini-3.1-flash-image",
      input: [
        {
          type: "text",
          text: "A beautiful cat"
        }
      ]
    })
  });

  const text = await response.text();
  console.log("Status:", response.status);
  console.log("Response length:", text.length);
  console.log("First 500 chars:", text.slice(0, 500));
}

test();
