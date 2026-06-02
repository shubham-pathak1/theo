import "../src/config/env.js";
import { env } from "../src/config/env.js";

const models = [
  "gemini-2.0-flash-lite",
  "gemini-2.0-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
  "gemini-3.5-flash"
];

for (const model of models) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": env.GEMINI_API_KEY
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: "Reply with exactly: ok" }] }]
      })
    }
  );

  if (!response.ok) {
    console.log(`${model}: ${response.status} ${await response.text()}`);
    continue;
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("").trim();
  console.log(`${model}: ${text || "no text"}`);
}
