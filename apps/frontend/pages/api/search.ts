import { NextRequest, NextResponse } from "next/server";
import type { CreateEmbeddingResponse } from "openai";
import type { PineconeResults } from "types";
import { Redis } from "@upstash/redis";

export const config = {
  runtime: "edge",
};

const RESPONSE_OPTIONS = {
  status: 200,
  headers: {
    "Content-Type": "application/json",
    "Cache-Control":
      process.env.NODE_ENV === "development"
        ? "no-store"
        : "s-maxage=86400, max-age=60",
  },
};

export default async function handler(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("query")?.trim();
  const {
    OPENAI_API_KEY,
    PINECONE_INDEX_URL,
    PINECONE_API_KEY,
    REDIS_REST_URL,
    REDIS_REST_TOKEN,
  } = process.env;
  if (
    !query ||
    query.length > 200 ||
    !OPENAI_API_KEY ||
    !PINECONE_INDEX_URL ||
    !PINECONE_API_KEY ||
    !REDIS_REST_URL ||
    !REDIS_REST_TOKEN
  ) {
    return new NextResponse("Bad Request", { status: 400 });
  }

  // Don't block on cache failing. Upstash has a 10k command limit per day.
  let redis: Redis | undefined = undefined;
  try {
    redis = new Redis({
      url: REDIS_REST_URL,
      token: REDIS_REST_TOKEN,
    });

    const cached = await redis.get(query);
    if (cached && typeof cached === "object") {
      return NextResponse.json(cached, RESPONSE_OPTIONS);
    }
  } catch {}

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

  if (redis) {
    try {
      await redis.set(query, JSON.stringify(pineconeJson));
    } catch {}
  }

  return NextResponse.json(pineconeJson, RESPONSE_OPTIONS);
}
