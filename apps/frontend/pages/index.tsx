import {
  Box,
  Button,
  Container,
  Flex,
  Heading,
  VStack,
  Text,
} from "@chakra-ui/react";
import { ArrowForwardIcon } from "@chakra-ui/icons";
import { useState } from "react";
import Link from "next/link";
import { SearchBar } from "@/components/SearchBar";
import { useRouter } from "next/router";

const EXAMPLE_QUERIES = [
  "Preventing bacterial contamination",
  "Eating mushrooms from contaminated substrates",
  "Biggest source of contamination",
  "Importance of light during fruiting",
  "Container to pressure cook agar in",
  "Tub not pinning",
  "Misting pins directly",
  "Storing mushrooms long-term",
];

export default function Home() {
  const [query, setQuery] = useState("");
  const router = useRouter();

  return (
    <Container>
      <Flex direction="column" justifyContent="space-between" height="100vh">
        <VStack align="start" mt={12} gap={4}>
          <VStack align="start">
            <Heading size="md" fontWeight="normal">
              RR Search
            </Heading>
            <Text color="gray.600">
              A semantic search engine for RR's Shroomery posts.
            </Text>
          </VStack>
          <Box pb={8} w="100%">
            <SearchBar
              query={query}
              setQuery={setQuery}
              onSearch={() =>
                router.push(`/search?query=${encodeURIComponent(query)}`)
              }
            />
          </Box>
          <Box width="100%">
            <Text color="gray.600">
              Need some inspiration? Try one of these:
            </Text>
            <VStack py={2} align="start" overflow="hidden">
              {EXAMPLE_QUERIES.map((query) => (
                <Link
                  href={`/search?query=${encodeURIComponent(query)}`}
                  key={query}
                >
                  <Box overflow="auto" width="100%">
                    <Button
                      borderRadius={50}
                      backgroundColor="white"
                      color="gray.700"
                      borderColor="gray.200"
                      fontWeight="normal"
                      borderWidth={1}
                      rightIcon={<ArrowForwardIcon />}
                      flexShrink={0}
                    >
                      {query}
                    </Button>
                  </Box>
                </Link>
              ))}
            </VStack>
          </Box>
        </VStack>
        {/* <Text color="gray.600" textAlign="center" mb={4}>
          Test{" "}
          <a href="https://github.com/williamyeny" target="_blank">
            test
          </a>
        </Text> */}
      </Flex>
    </Container>
  );
}
