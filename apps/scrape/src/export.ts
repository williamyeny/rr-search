import storage from "node-persist";
import fs from 'fs';
import { createObjectCsvWriter } from 'csv-writer';
// import { Post } from "types";

const exportToCSV = async () => {
  const storageProcessed = storage.create({ dir: "storage/processed" });
  await storageProcessed.init();

  const postKeys = (await storageProcessed.keys()).filter((key) =>
    key.startsWith("processedPost-")
  );

  const csvWriter = createObjectCsvWriter({
    path: 'posts.csv',
    header: [
      { id: 'id', title: 'id' },
      { id: 'title', title: 'title' },
      { id: 'content', title: 'content' },
      { id: 'forum', title: 'forum' },
      { id: 'when', title: 'when' },
      { id: 'utime', title: 'utime' },
      { id: 'first', title: 'first' },
      { id: 'last', title: 'last' },
    ]
  });

  const posts = [];
  for (const postKey of postKeys) {
    const post = await storageProcessed.getItem(postKey);
    posts.push(post);
  }

  await csvWriter.writeRecords(posts);
  console.log(`Exported ${posts.length} posts to posts.csv`);
};

(async () => {
  await exportToCSV();
})();
