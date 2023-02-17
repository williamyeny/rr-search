import { SearchBar } from "@/components/SearchBar";
import {
  Box,
  Container,
  Heading,
  VStack,
  Text,
  Flex,
  Link,
} from "@chakra-ui/react";
import { useRouter } from "next/router";
import { useCallback, useEffect, useState } from "react";
import { PineconeResults, Post } from "types";
import { NodeHtmlMarkdown } from "node-html-markdown";
import ReactMarkdown from "react-markdown";
import ky from "ky";
import { ExternalLinkIcon } from "@chakra-ui/icons";

const nhm = new NodeHtmlMarkdown({
  maxConsecutiveNewlines: 2,
  useInlineLinks: false,
});

const relativeToAbsolute = (url: string) => {
  return url.startsWith("/") ? `https://www.shroomery.org${url}` : url;
};

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
      <Container py={24}>
        <VStack
          gap={[2, 4]}
          opacity={isLoading ? 0 : 1}
          transition="opacity 0.2s ease"
        >
          {posts.map((post) => (
            <Box
              key={post.id}
              w="100%"
              borderRadius={12}
              borderColor="gray.200"
              borderWidth={1}
              p={4}
            >
              <Flex justify="space-between" alignItems="start">
                <Heading size="md" fontWeight="normal">
                  {post.title}
                </Heading>
                <Link
                  href={`https://www.shroomery.org/forums/showflat.php/Number/${post.id}`}
                  flexShrink={0}
                  height="fit-content"
                  isExternal
                  p={2}
                  position="relative"
                  top={-2}
                  right={-2}
                >
                  <ExternalLinkIcon display="block" />
                </Link>
              </Flex>

              <Box color="gray.600" className="markdown">
                <ReactMarkdown
                  transformImageUri={relativeToAbsolute}
                  transformLinkUri={relativeToAbsolute}
                >
                  {post.content}
                </ReactMarkdown>
              </Box>
              <Text color="gray.600" fontSize="sm">
                Score: {post.score}
              </Text>
            </Box>
          ))}
        </VStack>
      </Container>
      <Box w="100%" mt={8} top={0} position="fixed">
        <Container>
          <SearchBar
            query={query}
            setQuery={setQuery}
            onSearch={() => {
              search(query);
              router.push(`/search?query=${encodeURIComponent(query)}`);
            }}
          />
        </Container>
      </Box>
    </Box>
  );
}
