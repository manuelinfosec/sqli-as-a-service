import { Hono } from "hono";
import { serve } from "@hono/node-server"

const app = new Hono();

app.get('/', (c) => c.text("You're connected. Pass queries to `/query`"))

serve(app)
console.log("Listening on http://localhost:3000")