export type Post = {
  id: number;
  title: string;
  first: number;
  last: number;
  when: number;
  utime: string;
  content: string;
  removedContent?: boolean;
};

export type PineconeResults = {
  matches: { id: string; score: number; metadata: Record<string, unknown> }[];
  namespace: string;
};
