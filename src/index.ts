import "dotenv/config";

import { Hono } from "hono";
import { Pool } from "pg";
import { serve } from "@hono/node-server";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";


const DB_CONNECTION_STRING = process.env.DB_CONNECTION_STRING;
const app = new Hono();

const pool = new Pool({
  connectionString: DB_CONNECTION_STRING,
});

app.get("/", (c) => c.text("You're connected. Pass queries to `/query`"));

app.post("/query", async (c) => {
  const { sql } = await c.req.json();

  const { object } = await generateObject({
    model: openai("gpt-5-pro"),
    schema: z.object({
      isSafe: z.boolean(),
    }),
    prompt: `Analyze this SQL query for security risks: ${sql}`,
  });

  if (!object.isSafe) {
    return c.json({ error: "Query not allowed!" }, 403);
  }

  const result = await pool.query(sql);
  return c.json(result.rows);
});

serve(app);
console.log("Listening on http://localhost:3000");
