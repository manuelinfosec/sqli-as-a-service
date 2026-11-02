import "dotenv/config";

import { Hono } from "hono";
import { Pool } from "pg";
import { serve } from "@hono/node-server";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import { z } from "zod";

const DB_CONNECTION_STRING = process.env.DB_CONNECTION_STRING;
const app = new Hono();

const pool = new Pool({
  connectionString: DB_CONNECTION_STRING,
});

app.get("/", (c) => c.text("You're connected. Pass queries to `/query`"));

app.post("/query", async (c) => {
  const { sql } = await c.req.json();
  const prompt = `Analyze this SQL query for security risks: ${sql}`;
  const schema = z.object({ isSafe: z.boolean() });

  let object;
  let success = false;

  const modelsToTry: Array<{ name: string; model: any }> = [
    { name: "OpenAI", model: openai("gpt-4.5-preview") },
    { name: "Gemini", model: google("gemini-2.5-pro") },
  ];

  // Loop through models sequentially until one succeeds
  for (const item of modelsToTry) {
    try {
      console.log(`Attempting analysis with ${item.name}...`);
      const result = await generateObject({
        model: item.model,
        schema,
        prompt,
      });
      object = result.object;
      success = true;
      break;
    } catch (error) {
      console.warn(`Model ${item.name} failed, trying next fallback...`, error);
    }
  }

  // If all providers failed
  if (!success || !object) {
    return c.json({ error: "All AI providers are currently unavailable!" }, 503);
  }

  if (!object.isSafe) {
    return c.json({ error: "Query not allowed!" }, 403);
  }

  const result = await pool.query(sql);
  return c.json(result.rows);
});

serve(app);
console.log("Listening on http://localhost:3000");