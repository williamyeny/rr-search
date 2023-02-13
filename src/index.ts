import got from "got";
import storage from "node-persist";
import { load } from "cheerio";
import { encode } from "gpt-3-encoder";
import { NodeHtmlMarkdown } from "node-html-markdown";
import { Configuration, OpenAIApi } from "openai";
import * as dotenv from "dotenv";
import similarity from "compute-cosine-similarity";

dotenv.config();

const openai = new OpenAIApi(
  new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  })
);

const nhm = new NodeHtmlMarkdown({
  maxConsecutiveNewlines: 2,
  useInlineLinks: false,
});

const scrapeSearchPages = async (storageRaw: storage.LocalStorage) => {
  const MAX_SEARCH_PAGES = 331;
  const SEARCH_RESULTS_LIMIT = 100;

  for (let i = 0; i < MAX_SEARCH_PAGES; i++) {
    const pageKey = `page-${i}-limit-${SEARCH_RESULTS_LIMIT}`;
    const storedPage = await storage.getItem(pageKey);
    if (storedPage) {
      console.log(`Page ${i} already exists`);
      continue;
    }

    const data = await got
      .get(
        `https://www.shroomery.org/forums/dosearch.php?forum%5B%5D=f2&namebox=RogerRabbit&limit=${SEARCH_RESULTS_LIMIT}&sort=d&way=d&page=${i}`
      )
      .text();

    if (!data.includes("Subject") || !data.includes("Forum")) {
      console.log(`Page ${i} is not valid: ${data.slice(0, 100)}`);
      // continue;
      break;
    }

    await storage.setItem(pageKey, data);
    console.log(`Page ${i} saved`);

    await new Promise((resolve) =>
      setTimeout(resolve, Math.random() * 3000 + 3000)
    );
  }
};

const scrapePostFromPages = async (storageRaw: storage.LocalStorage) => {
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
      const postInfo = $("body")
        .find(".pp")
        .map((_, el) => ({ id: el.attribs.id.slice(1), title: $(el).text() }))
        .get();

      console.log(
        `[${numPagesProcessed}/${pageKeys.length}] Saving ${postInfo.length} posts from ${pageKey}...`
      );

      let numPostsProcessed = 0;
      for (const { id, title } of postInfo) {
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

          const $ = load(data, { xmlMode: true });
          const postJson = {
            id: parseInt($("id").text()),
            title,
            first: parseInt($("first").text()),
            last: parseInt($("last").text()),
            when: parseInt($("when").text()),
            utime: $("utime").text(),
            content: $("content").text(),
          };

          await storageRaw.setItem(postKey, postJson);
          console.log(
            `[${numPostsProcessed}/${postInfo.length}] Post ${id} saved`
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

const convertProcessedPostsToMarkdown = async (
  storageProcessed: storage.LocalStorage
) => {
  console.log("Loading...");
  await storageProcessed.init();
  const postKeys = (await storage.keys()).filter((key) =>
    key.startsWith("processedPost-")
  );
  console.log("Loaded.");

  let maxTokens = 0;
  let postWithMaxTokens = "";
  let numTokens = 0;
  for (const postKey of postKeys) {
    const post: { id: number; content: string } = await storage.getItem(
      postKey
    );
    const markdown = nhm.translate(post.content);
    const encoded = encode(markdown);
    if (encoded.length > maxTokens) {
      maxTokens = encoded.length;
      postWithMaxTokens = postKey;
    }
    numTokens += encoded.length;
  }
  console.log("numTokens", numTokens);
  console.log("maxTokens", maxTokens);
  console.log("postWithMaxTokens", postWithMaxTokens);
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
  const postKeys = (await storageRaw.keys()).filter((key) =>
    key.startsWith("post-")
  );
  // const postKeys = ["post-9570484"];
  // const postKeys = ["post-15218375"]; // Two sibling blockquotes
  // const postKeys = ["post-9923861"]; // Nested blockquotes

  for (const postKey of postKeys) {
    const post: Record<string, string | number> = await storageRaw.getItem(
      postKey
    );
    const content = post.content as string;

    const cleanedContent = content
      // Get rid of all font tags.
      .replace(/<\/?font.*?>/g, "")
      // Get rid of more than one br.
      .replace(/(<br \/>){2,}/g, "<br />")
      // Remove "<hr />" at the beginning of the blockquote
      .replace(/<blockquote>Quote:<hr \/><br \/>/g, "<blockquote>Quote:<br />")
      // Remove "<hr /> and <br />" at the end of the blockquote
      .replace(/<br \/><hr \/>(<\/blockquote>)?/g, "$1")
      // Bold tags around "<b><i>[user] said:</i></b>" (within the blockquote)
      .replace(
        /<blockquote>Quote:(.*?)<b><i>(.*?) said:<\/i><\/b>(.*?)<\/blockquote>/g,
        "<blockquote>Quote:<br /><strong>$2 said:</strong>$3</blockquote>"
      );

    const postJson = {
      ...post,
      content: cleanedContent,
    };

    await storageProcessed.setItem(`processedPost-${post.id}`, postJson);
    console.log(`Post ${post.id} processed`);
  }
};

// Move processed data from storageRaw to storageProcessed.
const moveProcessedData = async (
  storageRaw: storage.LocalStorage,
  storageProcessed: storage.LocalStorage
) => {
  await Promise.all([storageRaw.init(), storageProcessed.init()]);

  const postKeys = (await storageRaw.keys()).filter((key) =>
    key.startsWith("processedPost-")
  );
  let i = 0;
  for (const postKey of postKeys) {
    const post = await storageRaw.getItem(postKey);
    storageProcessed.setItem(postKey, post);
    storageRaw.removeItem(postKey);
    console.log(`${++i}/${postKeys.length}`);
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

  let postsToEmbed: { id: number; content: string; when: number }[] = [];
  let skipped = 0;
  for (const postKey of postKeys) {
    const id = parseInt(postKey.split("-")[1]);
    if (await storageEmbeddings.getItem(`embedding-${id}`)) {
      skipped++;
      continue;
    }
    const post: { content: string; when: number } =
      await storageProcessed.getItem(postKey);

    postsToEmbed.push({
      id,
      content: nhm.translate(post.content),
      when: post.when,
    });
  }
  console.log(`Skipped ${skipped} posts; already embedded.`);
  postsToEmbed = postsToEmbed.slice(0, 4000); // Remove later.

  // Call OpenAI API in batches.
  const BATCH_SIZE = 200;
  const batches: string[][] = [];
  for (let i = 0; i < postsToEmbed.length; i += BATCH_SIZE) {
    batches.push(
      postsToEmbed.slice(i, i + BATCH_SIZE).map((post) => post.content)
    );
  }

  console.log("Starting embedding...");

  let offset = 0;
  let totalTokensUsed = 0;
  for (const batch of batches) {
    const res = await openai.createEmbedding({
      model: "text-embedding-ada-002",
      input: batch,
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

    offset += batch.length;
    console.log(`${offset}/${postsToEmbed.length} embedded`);

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  console.log(
    `${totalTokensUsed} tokens used, costing ${
      (totalTokensUsed / 1000) * 0.0004
    }`
  );
};

const search = async (
  query: string,
  storageEmbeddings: storage.LocalStorage
) => {
  const res = await openai.createEmbedding({
    model: "text-embedding-ada-002",
    input: [query],
  });

  const { data } = res.data;
  const queryEmbedding = data[0].embedding;

  const posts: { id: number; content: string; embedding: number[] }[] =
    await storageEmbeddings.values();
  const result = posts
    .map((post) => ({
      id: post.id,
      content: post.content,
      similarity: similarity(queryEmbedding, post.embedding),
    }))
    .sort((a, b) => b.similarity - a.similarity);

  console.log(result.slice(0, 5));
};

// Whoops.
const addTitle = async (
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
    const postInfo = $("body")
      .find(".pp")
      .map((_, el) => ({ id: el.attribs.id.slice(1), title: $(el).text() }))
      .get();

    for (const { id, title } of postInfo) {
      const post: Record<string, string | number> | undefined =
        await storageProcessed.getItem(`processedPost-${id}`);
      if (post) {
        const { cleanedPost, ...rest } = post;
        await storageProcessed.setItem(`processedPost-${id}`, {
          ...rest,
          content: cleanedPost,
          title,
        });
      } else {
        console.error(`Post ${id} not found`);
      }
    }

    console.log(`Processed ${pageKey}`);
  }
};

(async () => {
  const storageProcessed = storage.create({ dir: "storage-processed" });
  const storageRaw = storage.create({ dir: "storage-raw" });
  const storageEmbeddings = storage.create({ dir: "storage-embeddings" });
  // await scrapeSearchPages(storageRaw);
  // await scrapePostFromPages(storageRaw);
  // await viewPost("9570484", storageRaw);
  // await processPosts(storageRaw, storageProcessed);
  // await convertProcessedPostsToMarkdown(storageProcessed);
  // moveProcessedData(storageRaw, storageProcessed);
  await addTitle(storageRaw, storageProcessed);

  // await getEmbeddings(storageProcessed, storageEmbeddings);
  // search("Easiest way to get started for a beginner", storageEmbeddings);
})();
