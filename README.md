# RR Search

A semantic search engine for RogerRabbit's Shroomery posts. It uses vector embeddings from OpenAI's Ada embedding API and Pinecone to search the embeddings.

Note that many of RR's comments are outdated or incorrect. Do not use as credible source.

## Getting started

Create a `.env` at this repo's root level and populate:

```
OPENAI_API_KEY=""
PINECONE_API_KEY=""
PINECONE_INDEX_URL=""
REDIS_REST_URL=""
REDIS_REST_TOKEN=""
```

Redis is optional.

Run `pnpm i`.

Scaping logic is in `apps/scrape`. Should've been a Jupyter Notebook but whatever. All responses are cached. Run `pnpm scrape` to scrape.

Frontend is in `apps/frontend`. Run `pnpm dev` to start frontend server.
