import { SearchBar } from "@/components/SearchBar";
import { Box, Container, Heading, VStack, Text } from "@chakra-ui/react";
import { useRouter } from "next/router";
import { useCallback, useEffect, useState } from "react";
import { PineconeResults, Post } from "types";
import { NodeHtmlMarkdown } from "node-html-markdown";
import ReactMarkdown from "react-markdown";
import ky from "ky";

const nhm = new NodeHtmlMarkdown({
  maxConsecutiveNewlines: 2,
  useInlineLinks: false,
});

export default function Search() {
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const [posts, setPosts] = useState<({ score: number } & Post)[]>([]);

  const search = useCallback(async (query: string) => {
    setIsLoading(true);
    try {
      const results = await ky(
        `/api/search?query=${encodeURIComponent(query)}`
      ).json<PineconeResults>();
      setPosts(
        results.matches.map(({ metadata, ...rest }) => ({
          ...rest,
          ...metadata,
          content: nhm.translate(metadata.content), // This should be done at scrape-time.
        }))
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (router.isReady) {
      const passedInQuery = router.query.query;
      if (passedInQuery && !Array.isArray(passedInQuery)) {
        search(passedInQuery);
        setQuery(passedInQuery);
      } else {
        console.log("redirecting out");
        router.push("/");
      }
    }
  }, [router]);

  return (
    <Box>
      <Box w="100%" mt={8} position="fixed">
        <Container>
          <SearchBar
            query={query}
            setQuery={setQuery}
            onSearch={() => search(query)}
          />
        </Container>
      </Box>
      <Container py={24}>
        <VStack gap={4} opacity={isLoading ? 0 : 1}>
          {posts.map((post) => (
            <Box key={post.id} w="100%">
              <Heading size="md" fontWeight="normal" mb={2}>
                {post.title}
              </Heading>
              <Box color="gray.600" className="markdown">
                <ReactMarkdown>{post.content}</ReactMarkdown>
              </Box>
              <Text color="gray.600" fontSize="sm">
                ID: {post.id} | Score: {post.score}
              </Text>
            </Box>
          ))}
        </VStack>
      </Container>
    </Box>
  );
}
