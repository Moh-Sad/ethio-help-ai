import axios from "axios";

export async function getEmbedding(text) {
  const res = await axios.post(
    "https://api.openai.com/v1/embeddings",
    {
      model: "text-embedding-3-large",
      input: text,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
    }
  );

  return res.data.data[0].embedding;
}