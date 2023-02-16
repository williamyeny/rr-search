// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import { Configuration, OpenAIApi } from "openai";
import got from "got";
import { PineconeResults } from "@/../../packages/types/src";

const openai = new OpenAIApi(
  new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  })
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PineconeResults>
) {
  const query = req.query.query;
  if (!query) {
    res.status(400);
    return;
  }

  // TODO: handle errors such as query too long.
  const embeddingRes = await openai.createEmbedding({
    model: "text-embedding-ada-002",
    input: [query],
  });

  const queryEmbedding = embeddingRes.data.data[0].embedding;

  const pineconeResults = await got
    .post(`https://${process.env.PINECONE_INDEX_URL}/query`, {
      json: {
        namespace: "rr-posts",
        topK: 20,
        includeMetadata: true,
        includeValues: false,
        vector: queryEmbedding,
      },
      headers: {
        "Api-Key": process.env.PINECONE_API_KEY,
      },
    })
    .json<PineconeResults>();

  res.status(200).json(pineconeResults);
}
