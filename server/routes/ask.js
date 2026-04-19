import express from "express";
import { getEmbedding } from "../services/embedding.js";
import { search } from "../services/retrieval.js";
import { buildPrompt } from "../services/rag.js";
import { generateAnswer } from "../services/rag.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const { query } = req.body;

  const embedding = await getEmbedding(query);
  const docs = await search(embedding);

  const prompt = buildPrompt(query, docs);
  const answer = await generateAnswer(prompt);

  res.json({ answer, docs });
});

export default router;