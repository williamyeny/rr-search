export type Post = {
  id: number;
  title: string;
  first: number;
  last: number;
  when: number;
  utime: string;
  content: string;
  forum: string;
  removedContent?: boolean;
};

export type PineconeResults = {
  matches: { id: string; score: number; metadata: Post }[];
  namespace: string;
};
