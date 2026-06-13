import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Gemini Setup
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // API endpoint for dynamic spelling and grammar checking
  app.post("/api/spellcheck", async (req, res) => {
    try {
      const { text } = req.body;
      if (!text || typeof text !== "string") {
        return res.status(400).json({ error: "Missing or invalid text" });
      }

      // Check spelling and grammar and return corrections
      const prompt = `Analyze the following user-submitted text for any spelling or grammar mistakes.
For each mistake, provide:
1. The exact mistyped text/word.
2. The corrected suggestion.
3. A very brief and friendly explanation of the error.

If there are no mistakes, return an empty array.
Format your output strictly as a JSON array of objects, where each object has:
{
  "original": "mistranslated/mistyped portion",
  "suggestion": "corrected portion",
  "reason": "brief reason"
}

Text to analyze: "${text}"`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          // Define a response schema so that the model returns exactly the JSON format we need
          responseSchema: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                original: { type: "STRING" },
                suggestion: { type: "STRING" },
                reason: { type: "STRING" }
              },
              required: ["original", "suggestion", "reason"]
            }
          }
        }
      });

      const resultText = response.text || "[]";
      res.json({ corrections: JSON.parse(resultText) });
    } catch (error: any) {
      console.error("Gemini spellcheck error:", error);
      res.status(500).json({ error: error.message || "An error occurred during verification" });
    }
  });

  // API endpoint for SEO optimization and analysis
  app.post("/api/seo-analyze", async (req, res) => {
    try {
      const { content, title, targetKeywords } = req.body;
      if (!content) {
        return res.status(400).json({ error: "Content is required for SEO analysis" });
      }

      const prompt = `Analyze the following webpage content and provide SEO analysis.
Webpage Title: "${title || ''}"
User's Target Keywords: "${targetKeywords || ''}"
Content: "${content}"

Analyze:
1. Keyword density for the target keywords.
2. Suggested additional SEO keywords that are relevant.
3. An optimized search-engine friendly title (maximum 60 chars) and meta description (maximum 160 chars).
4. Feedback on head structure and readability.

Your response must be a JSON object with this exact structure:
{
  "keywordDensity": [
    { "keyword": "keyword name", "count": 12, "percentage": "1.5%" }
  ],
  "suggestedKeywords": ["seo", "keywords", "relevant"],
  "optimizedTitle": "Optimized Page Title",
  "optimizedMetaDescription": "Optimized search engine meta description under 160 chars.",
  "structureFeedback": "Suggestions on H1/H2 heading structure and general content flow."
}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              keywordDensity: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    keyword: { type: "STRING" },
                    count: { type: "INTEGER" },
                    percentage: { type: "STRING" }
                  },
                  required: ["keyword", "count", "percentage"]
                }
              },
              suggestedKeywords: {
                type: "ARRAY",
                items: { type: "STRING" }
              },
              optimizedTitle: { type: "STRING" },
              optimizedMetaDescription: { type: "STRING" },
              structureFeedback: { type: "STRING" }
            },
            required: ["keywordDensity", "suggestedKeywords", "optimizedTitle", "optimizedMetaDescription", "structureFeedback"]
          }
        }
      });

      const resultText = response.text || "{}";
      res.json(JSON.parse(resultText));
    } catch (error: any) {
      console.error("Gemini SEO error:", error);
      res.status(500).json({ error: error.message || "An error occurred during SEO suggestion generation" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
