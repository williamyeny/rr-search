import { SearchBar } from "@/components/SearchBar";
import { Box, Container, Heading, VStack, Text, Link } from "@chakra-ui/react";
import { useRouter } from "next/router";
import { useCallback, useEffect, useState } from "react";
import { PineconeResults, Post } from "types";
import { NodeHtmlMarkdown } from "node-html-markdown";
import ky from "ky";
import { ExternalLinkIcon } from "@chakra-ui/icons";
import { format } from "date-fns";
import { useToast } from "@chakra-ui/react";
import { Markdown } from "@/components/Markdown";

const nhm = new NodeHtmlMarkdown({
  maxConsecutiveNewlines: 2,
  useInlineLinks: false,
});

export default function Search() {
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const [posts, setPosts] = useState<({ score: number } & Post)[]>([]);

  const toast = useToast();

  const search = useCallback(
    async (query: string) => {
      const trimmedQuery = query.trim();
      if (trimmedQuery.length > 200) {
        toast({
          title: "Query too long.",
          description: "Please try again with a shorter query.",
          status: "error",
          isClosable: true,
        });
        return;
      }
      setIsLoading(true);
      try {
        const results = await ky(
          `/api/search?query=${encodeURIComponent(trimmedQuery)}`
        ).json<PineconeResults>();
        setPosts(
          results.matches.map(({ metadata, ...rest }) => ({
            ...rest,
            ...metadata,
            content: nhm.translate(metadata.content), // This should be done at scrape-time.
          }))
        );
      } catch (e) {
        toast({
          title: "An error occurred.",
          description: "Please try again later.",
          status: "error",
          isClosable: true,
        });
      } finally {
        setIsLoading(false);
      }
    },
    [toast]
  );

  useEffect(() => {
    if (router.isReady) {
      const passedInQuery = router.query.query;
      if (!passedInQuery || Array.isArray(passedInQuery)) {
        router.push("/");
        return;
      }

      setQuery(passedInQuery);
      search(passedInQuery);
    }
  }, [router, search]);

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
              position="relative"
            >
              <Link
                href={`https://www.shroomery.org/forums/showflat.php/Number/${post.id}`}
                flexShrink={0}
                height="fit-content"
                isExternal
                p={2}
                position="absolute"
                top={2}
                right={2}
              >
                <ExternalLinkIcon display="block" />
              </Link>
              <Heading size="md" fontWeight="medium" pr="32px">
                {post.title}
              </Heading>

              <Text color="gray.600" fontSize="sm">
                {format(new Date(post.when * 1000), "MMM d, yyyy")}
              </Text>

              <Markdown>{post.content}</Markdown>
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
              router.push(`/search?query=${encodeURIComponent(query)}`);
            }}
            isLoading={isLoading}
          />
        </Container>
      </Box>
    </Box>
  );
}
