import { NextRequest, NextResponse } from "next/server";
import type { CreateEmbeddingResponse } from "openai";
import type { PineconeResults } from "@/../../packages/types/src";

export const config = {
  runtime: "edge",
};

export default async function handler(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("query");
  const { OPENAI_API_KEY, PINECONE_INDEX_URL, PINECONE_API_KEY } = process.env;
  if (
    !query ||
    query.length > 200 ||
    !OPENAI_API_KEY ||
    !PINECONE_INDEX_URL ||
    !PINECONE_API_KEY
  ) {
    return new NextResponse("Bad Request", { status: 400 });
  }

  const embeddingRes = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    body: JSON.stringify({
      model: "text-embedding-ada-002",
      input: [query],
    }),
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
  });
  const embeddingJson: CreateEmbeddingResponse = await embeddingRes.json();

  console.log(embeddingJson);

  const queryEmbedding = embeddingJson.data[0].embedding;

  const pineconeRes = await fetch(`https://${PINECONE_INDEX_URL}/query`, {
    method: "POST",
    body: JSON.stringify({
      namespace: "rr-posts",
      topK: 20,
      includeMetadata: true,
      includeValues: false,
      vector: queryEmbedding,
    }),
    headers: {
      "Api-Key": PINECONE_API_KEY,
      "Content-Type": "application/json",
    },
  });
  const pineconeJson: PineconeResults = await pineconeRes.json();

  return new NextResponse(JSON.stringify(pineconeJson), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "s-maxage=86400, max-age=60",
    },
  });
}
