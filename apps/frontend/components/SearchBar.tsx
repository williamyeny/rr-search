import { SearchIcon } from "@chakra-ui/icons";
import { Flex, Input, Button } from "@chakra-ui/react";

export const SearchBar = ({
  query,
  setQuery,
  onSearch,
  isLoading,
}: {
  query: string;
  setQuery: (query: string) => void;
  onSearch: () => void;
  isLoading?: boolean;
}) => (
  <form
    onSubmit={(e) => {
      e.preventDefault();
      onSearch();
    }}
  >
    <Flex gap={2} justify="space-between">
      <Input
        placeholder="Query"
        borderRadius={50}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        backgroundColor="white"
      />
      <Button
        right={0}
        leftIcon={<SearchIcon />}
        flexShrink={0}
        backgroundColor="black"
        color="white"
        borderRadius={50}
        isDisabled={isLoading}
        type="submit"
      >
        Search
      </Button>
    </Flex>
  </form>
);
