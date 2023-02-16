import {
  Box,
  Button,
  Container,
  Flex,
  Heading,
  Input,
  VStack,
  Text,
  HStack,
} from "@chakra-ui/react";
import { SearchIcon, ChevronRightIcon } from "@chakra-ui/icons";
import { useState } from "react";
import Link from "next/link";
import { SearchBar } from "@/components/SearchBar";

const EXAMPLE_QUERIES = [
  "Preventing bacterial contamination",
  "Eating mushrooms from contaminated substrates",
  "Spotting contamination in grain jars",
  "Preparing manure as substrate",
  "Importance of light during fruiting",
  "Container to pressure cook agar in",
  "Tub not pinning",
  "Using lime in substrate",
  "Storing mushrooms long-term",
];

export default function Home() {
  const [query, setQuery] = useState("");
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
            <SearchBar query={query} setQuery={setQuery} />
          </Box>
          <Box width="100%">
            <Text color="gray.600" mb={2}>
              Need some inspiration? Try one of these:
            </Text>
            <HStack overflow="auto">
              {EXAMPLE_QUERIES.map((query) => (
                <Link href={`/search?query=${encodeURIComponent(query)}`}>
                  <Button
                    borderRadius={50}
                    backgroundColor="white"
                    color="gray.700"
                    borderColor="gray.200"
                    fontWeight="normal"
                    borderWidth={1}
                    rightIcon={<ChevronRightIcon />}
                    flexShrink={0}
                  >
                    {query}
                  </Button>
                </Link>
              ))}
            </HStack>
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
