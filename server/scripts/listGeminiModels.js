import "../src/config/env.js";
import { env } from "../src/config/env.js";

if (!env.GEMINI_API_KEY) {
  console.error("GEMINI_API_KEY is missing in .env");
  process.exit(1);
}

const response = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models?key=${env.GEMINI_API_KEY}`
);

if (!response.ok) {
  console.error(await response.text());
  process.exit(1);
}

const data = await response.json();
const models = (data.models || [])
  .filter((model) => model.supportedGenerationMethods?.includes("generateContent"))
  .map((model) => ({
    name: model.name.replace("models/", ""),
    displayName: model.displayName,
    methods: model.supportedGenerationMethods.join(", ")
  }));

console.table(models);
