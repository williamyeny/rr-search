import { SearchIcon } from "@chakra-ui/icons";
import { Flex, Input, Button } from "@chakra-ui/react";
import Link from "next/link";

export const SearchBar = ({
  query,
  setQuery,
}: {
  query: string;
  setQuery: (query: string) => void;
}) => (
  <Flex w="100%" gap={2}>
    <Input
      placeholder="Query"
      borderRadius={50}
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      backgroundColor="white"
    />
    <Link href={`/search?query=${encodeURIComponent(query)}`}>
      <Button
        right={0}
        leftIcon={<SearchIcon />}
        flexShrink={0}
        backgroundColor="black"
        color="white"
        borderRadius={50}
      >
        Search
      </Button>
    </Link>
  </Flex>
);
