import got from "got";
import storage from "node-persist";
import htmlparser2 from "htmlparser2";
import CSSselect from "css-select";
import { parse } from "node-html-parser";
import cheerio, { load } from "cheerio";

const MAX_SEARCH_PAGES = 331;
const SEARCH_RESULTS_LIMIT = 100;
const getPageKey = (page: number) =>
  `page-${page}-limit-${SEARCH_RESULTS_LIMIT}`;

const scrapeSearchPages = async () => {
  for (let i = 0; i < MAX_SEARCH_PAGES; i++) {
    const pageKey = getPageKey(i);
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

const scrapePostFromPages = async () => {
  const pageKeys = (await storage.keys())
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
      const page: string = await storage.getItem(pageKey);
      // const dom = htmlparser2.parseDocument(page);
      // const postLinks = CSSselect("a[href^='showflat.php']", dom.childNodes);
      // const root = parse(page);
      // console.log(root.querySelectorAll(".forumtr").length);
      // console.log(root.querySelector("body"));

      // const postIds = root
      //   .querySelectorAll(".forumtr")
      //   .map((el) => el.id.slice(1));
      // console.log(pageKey);
      //

      const $ = load(page);
      const postIds = $("body")
        .find(".forumtr")
        .map((_, el) => el.attribs.id.slice(1))
        .get();

      console.log(
        `[${numPagesProcessed}/${pageKeys.length}] Saving ${postIds.length} posts from ${pageKey}...`
      );

      let numPostsProcessed = 0;
      for (const postId of postIds) {
        numPostsProcessed++;
        try {
          const postKey = `post-${postId}`;
          const storedPost = await storage.getItem(postKey);
          if (storedPost) {
            console.log(`Post ${postId} already exists`);
            continue;
          }
          const data = await got
            .get(
              `https://www.shroomery.org/forums/includes/tooltip/postcontents.php?n=${postId}`
            )
            .text();

          if (data.includes("<name></name>") || !data.includes("<name>")) {
            console.log(`Post ${postId} is not valid: ${data.slice(0, 100)}`);
            continue;
          }

          await storage.setItem(postKey, data);
          console.log(
            `[${numPostsProcessed}/${postIds.length}] Post ${postId} saved`
          );
          await new Promise((resolve) =>
            setTimeout(resolve, Math.random() * 1000 + 500)
          );
        } catch (e) {
          console.error(`Error on post ${postId}`);
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

(async () => {
  await storage.init({ dir: "storage" });
  // await scrapeSearchPages();
  await scrapePostFromPages();
})();
