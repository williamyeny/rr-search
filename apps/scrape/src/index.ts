import got from "got";
import storage from "node-persist";
import { load } from "cheerio";
import { NodeHtmlMarkdown } from "node-html-markdown";
import { Configuration, OpenAIApi } from "openai";
import { similarity } from "ml-distance";
import { getEnvVar } from "./utils.js";
import { Post } from "types";

/**
 * 1. Search pages get scraped and put in storageRaw.
 * 2. Post IDs are extracted from the search pages.
 * 3. Posts are scraped using the found IDs and put in storageRaw.
 * 4. Posts are processed (add metadata like title and put into JSON format).
 * 5. Posts are sent to OpenAI to generate vector embeddings.
 * 6. Embeddings are uploaded to Pinecome (vector database).
 */

const openai = new OpenAIApi(
  new Configuration({
    apiKey: getEnvVar("OPENAI_API_KEY"),
  })
);

const nhm = new NodeHtmlMarkdown({
  maxConsecutiveNewlines: 2,
  useInlineLinks: false,
});

const scrapeSearchPages = async (storageRaw: storage.LocalStorage) => {
  await storageRaw.init();
  const MAX_SEARCH_PAGES = 359; // This should be scraped, not hard-coded.
  const SEARCH_RESULTS_LIMIT = 100;

  for (let i = 0; i < MAX_SEARCH_PAGES; i++) {
    const pageKey = `page-${i}`;
    const storedPage = await storageRaw.getItem(pageKey);
    if (storedPage) {
      console.log(`Page ${i} already exists`);
      continue;
    }

    const data = await got
      .get(
        `https://www.shroomery.org/forums/dosearch.php?forum%5B%5D=f2&forum%5B%5D=f4&namebox=RogerRabbit&limit=${SEARCH_RESULTS_LIMIT}&sort=d&way=d&page=${i}`
      )
      .text();

    if (!data.includes("Subject") || !data.includes("Forum")) {
      console.log(`Page ${i} is not valid: ${data.slice(0, 100)}`);
      // continue;
      break;
    }

    await storageRaw.setItem(pageKey, data);
    console.log(`Page ${i} saved`);

    await new Promise(
      (resolve) => setTimeout(resolve, Math.random() * 1000 + 2000) // Since we're loading HTML pages, give it extra delay.
    );
  }
};

const scrapePostFromPages = async (storageRaw: storage.LocalStorage) => {
  await storageRaw.init();
  const pageKeys = (await storageRaw.keys())
    .filter((key) => key.startsWith("page-"))
    .sort((a, b) => {
      const pageA = parseInt(a.split("-")[1]);
      const pageB = parseInt(b.split("-")[1]);
      return pageA - pageB;
    });

  let numPagesProcessed = 0;
  for (const pageKey of pageKeys) {
    numPagesProcessed++;
    try {
      const page: string = await storageRaw.getItem(pageKey);

      const $ = load(page);
      const postIds = $("body")
        .find(".pp")
        .map((_, el) => el.attribs.id.slice(1))
        .get();

      console.log(
        `[${numPagesProcessed}/${pageKeys.length}] Saving ${postIds.length} posts from ${pageKey}...`
      );

      let numPostsProcessed = 0;
      for (const id of postIds) {
        numPostsProcessed++;
        try {
          const postKey = `post-${id}`;
          const storedPost = await storageRaw.getItem(postKey);
          if (storedPost) {
            console.log(`Post ${id} already exists`);
            continue;
          }
          const data = await got
            .get(
              `https://www.shroomery.org/forums/includes/tooltip/postcontents.php?n=${id}`
            )
            .text();

          if (data.includes("<name></name>") || !data.includes("<name>")) {
            console.log(`Post ${id} is not valid: ${data.slice(0, 100)}`);
            continue;
          }

          await storageRaw.setItem(postKey, data);
          console.log(
            `[${numPostsProcessed}/${postIds.length}] Post ${id} saved`
          );
          await new Promise((resolve) =>
            setTimeout(resolve, Math.random() * 1000 + 500)
          );
        } catch (e) {
          console.error(`Error on post ${id}`);
          console.error(e);
        }
      }
    } catch (e) {
      console.error(`Error on page ${pageKey}`);
      console.error(e);
      continue;
    }
  }
};

const viewPost = async (postId: string, storageRaw: storage.LocalStorage) => {
  const postKey = `post-${postId}`;
  const post: string = await storageRaw.getItem(postKey);
  const $ = load(post, { xmlMode: true });
  const postContent = $("content").text();
  console.log(postContent);
};

const processPosts = async (
  storageRaw: storage.LocalStorage,
  storageProcessed: storage.LocalStorage
) => {
  await Promise.all([storageRaw.init(), storageProcessed.init()]);
  const pageKeys = (await storageRaw.keys()).filter((key) =>
    key.startsWith("page-")
  );

  for (const pageKey of pageKeys) {
    const page: string = await storageRaw.getItem(pageKey);
    const $ = load(page);
    const postIdsAndTitles = $("body")
      .find(".pp")
      .map((_, el) => ({ id: el.attribs.id.slice(1), title: $(el).text() }))
      .get();
    const postForums = $("body")
      .find(".forumrow a")
      .map((_, el) => $(el).text().slice(1, -1)) // Slice to remove the leading and trailing newlines.
      .get();

    if (postIdsAndTitles.length !== postForums.length) {
      console.log(
        `${pageKey}: postIdsAndTitles length (${postIdsAndTitles.length}) does not match postForums length (${postForums.length})`
      );
      continue;
    }

    const postInfo = postIdsAndTitles.map((idsAndTitles, i) => ({
      ...idsAndTitles,
      forum: postForums[i],
    }));

    for (const { id, title, forum } of postInfo) {
      const postKey = `post-${id}`;
      const post: string | undefined = await storageRaw.getItem(postKey);
      if (!post) {
        console.log(`Post ${id} not found`);
        continue;
      }
      const $ = load(post, { xmlMode: true });
      const content = $("content").text();
      const cleanedContent = content
        // Get rid of all font tags.
        .replace(/<\/?font.*?>/g, "")
        // Remove "<hr />" at the beginning of the blockquote
        .replace(
          /<blockquote>Quote:<hr \/><br \/>/g,
          "<blockquote>Quote:<br />"
        )
        // Remove "<hr /> and <br />" at the end of the blockquote
        .replace(/<br \/><hr \/>(<\/blockquote>)?/g, "$1")
        // Bold tags around "<b><i>[user] said:</i></b>" (within the blockquote)
        .replace(
          /<blockquote>Quote:(.*?)<b><i>(.*?) said:<\/i><\/b>(.*?)<\/blockquote>/g,
          "<blockquote>Quote:<br /><b>$2 said:</b>$3</blockquote>"
        );

      const postJson: Post = {
        id: parseInt($("id").text()),
        first: parseInt($("first").text()),
        last: parseInt($("last").text()),
        when: parseInt($("when").text()),
        utime: $("utime").text(),
        content: cleanedContent,
        title,
        forum,
      };

      await storageProcessed.setItem(`processedPost-${postJson.id}`, postJson);
    }
  }
};

const getEmbeddings = async (
  storageProcessed: storage.LocalStorage,
  storageEmbeddings: storage.LocalStorage
) => {
  await Promise.all([storageProcessed.init(), storageEmbeddings.init()]);
  const postKeys = (await storageProcessed.keys()).filter((key) =>
    key.startsWith("processedPost-")
  );

  let postsToEmbed: Post[] = [];
  let skipped = 0;
  for (const postKey of postKeys) {
    const id = parseInt(postKey.split("-")[1]);
    if (await storageEmbeddings.getItem(`embedding-${id}`)) {
      skipped++;
      continue;
    }
    const post: Post = await storageProcessed.getItem(postKey);

    postsToEmbed.push(post);
  }
  if (skipped) {
    console.log(`Skipped ${skipped} posts; already embedded.`);
  }
  // postsToEmbed = postsToEmbed.slice(0, 5); // Remove later.

  // Call OpenAI API in batches.
  const BATCH_SIZE = 100;
  const inputBatches: string[][] = [];
  for (let i = 0; i < postsToEmbed.length; i += BATCH_SIZE) {
    inputBatches.push(
      postsToEmbed
        .slice(i, i + BATCH_SIZE)
        .map((post) => nhm.translate(`<h1>${post.title}</h1>` + post.content))
    );
  }

  console.log("Starting embedding...");

  let offset = 0;
  let totalTokensUsed = 0;
  for (const input of inputBatches) {
    const res = await openai.createEmbedding({
      model: "text-embedding-ada-002",
      input,
    });

    const { data, usage } = res.data;
    totalTokensUsed += usage.total_tokens;

    for (const entry of data) {
      const post = postsToEmbed[entry.index + offset];
      await storageEmbeddings.setItem(`embedding-${post.id}`, {
        ...post,
        embedding: entry.embedding,
      });
    }

    offset += input.length;
    console.log(`${offset}/${postsToEmbed.length} embedded`);

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  console.log(
    `${totalTokensUsed} tokens used, costing ${
      (totalTokensUsed / 1000) * 0.0004
    }`
  );
};

const searchLocally = async (
  query: string,
  storageEmbeddings: storage.LocalStorage
) => {
  await storageEmbeddings.init();
  const res = await openai.createEmbedding({
    model: "text-embedding-ada-002",
    input: [query],
  });

  const queryEmbedding = res.data.data[0].embedding;

  const posts: { id: number; content: string; embedding: number[] }[] =
    await storageEmbeddings.values();
  const result = posts
    .map((post) => ({
      id: post.id,
      content: post.content,
      similarity: similarity.cosine(queryEmbedding, post.embedding),
    }))
    .sort((a, b) => b.similarity - a.similarity);

  console.log(result.slice(0, 5));
};

const searchPinecone = async (query: string) => {
  const embeddingRes = await openai.createEmbedding({
    model: "text-embedding-ada-002",
    input: [query],
  });

  const queryEmbedding = embeddingRes.data.data[0].embedding;

  type PineconeResults = {
    matches: { id: string; score: number; metadata: Record<string, unknown> }[];
    namespace: string;
  };

  const { matches } = await got
    .post(`https://${getEnvVar("PINECONE_INDEX_URL")}/query`, {
      json: {
        namespace: "rr-posts",
        topK: 20,
        includeMetadata: true,
        includeValues: false,
        vector: queryEmbedding,
      },
      headers: {
        "Api-Key": getEnvVar("PINECONE_API_KEY"),
      },
    })
    .json<PineconeResults>();

  console.log(matches);
};

const sendEmbeddingsToPinecone = async (
  storageEmbeddings: storage.LocalStorage
) => {
  await storageEmbeddings.init();
  const posts: (Post & { embedding: number[] })[] =
    await storageEmbeddings.values();

  const vectors = posts
    .map((post) => ({
      id: post.id.toString(),
      metadata: {
        title: post.title,
        when: post.when,
        utime: post.utime,
        first: post.first,
        last: post.last,
        content: post.content,
        forum: post.forum,
        poster: "RogerRabbit",
      },
      values: post.embedding,
    }))
    .map((post) => {
      // Pinecone has a 10KB metadata limit per vector.
      if (Buffer.from(JSON.stringify(post.metadata)).length > 10240) {
        console.log(`Removing content in ${post.id} due to metadata size`);
        return {
          ...post,
          metadata: {
            ...post.metadata,
            content: "",
            removedContent: true,
          },
        };
      }
      return post;
    });

  const failedPineconeUpserts: string[] = [];
  const VECTOR_BATCH_SIZE = 100;
  for (let i = 0; i < vectors.length; i += VECTOR_BATCH_SIZE) {
    const output = {
      vectors: vectors.slice(i, i + VECTOR_BATCH_SIZE),
      namespace: "rr-posts",
    };

    try {
      await got
        .post(`https://${getEnvVar("PINECONE_INDEX_URL")}/vectors/upsert`, {
          json: output,
          headers: {
            "Api-Key": getEnvVar("PINECONE_API_KEY"),
          },
        })
        .json();
    } catch (e) {
      failedPineconeUpserts.push(`${i}-${i + output.vectors.length}`);
      console.error(e);
    }
    console.log(
      `Upserted ${i + output.vectors.length}/${vectors.length} vectors`
    );
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  if (failedPineconeUpserts.length > 0) {
    console.log(
      `Failed to upsert in ${
        failedPineconeUpserts.length
      } requests: ${failedPineconeUpserts.join(", ")}`
    );
  }
};

(async () => {
  const storageProcessed = storage.create({ dir: "storage/processed" });
  const storageRaw = storage.create({ dir: "storage/raw" });
  const storageEmbeddings = storage.create({ dir: "storage/embeddings" });
  // await scrapeSearchPages(storageRaw);

  // await scrapePostFromPages(storageRaw);
  // await viewPost("9570484", storageRaw);
  // await processPosts(storageRaw, storageProcessed);

  // await getEmbeddings(storageProcessed, storageEmbeddings);
  // search("how to prevent contamination?", storageEmbeddings);

  sendEmbeddingsToPinecone(storageEmbeddings);

  // searchPinecone("Storing dried mushrooms long-term");
})();
