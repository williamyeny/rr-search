import { CloseIcon, SearchIcon } from "@chakra-ui/icons";
import {
  Flex,
  Input,
  Button,
  Box,
  IconButton,
  Spinner,
} from "@chakra-ui/react";
import { useRef } from "react";

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
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSearch();
      }}
    >
      <Flex gap={2} justify="space-between">
        <Box position="relative" w="100%">
          <Input
            ref={inputRef}
            placeholder="Query"
            borderRadius={50}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            backgroundColor="white"
            pr="32px"
          />
          {query && (
            <IconButton
              borderRadius={50}
              background="none"
              _hover={{ background: "none" }}
              icon={<CloseIcon boxSize="0.7em" />}
              aria-label="Clear query"
              position="absolute"
              right={0}
              onClick={() => {
                setQuery("");
                if (inputRef.current) inputRef.current.focus();
              }}
              zIndex={1} // TODO: use portal?
            />
          )}
        </Box>

        <Button
          right={0}
          leftIcon={!isLoading ? <SearchIcon /> : <Spinner />}
          flexShrink={0}
          backgroundColor="black"
          color="white"
          borderRadius={50}
          isDisabled={isLoading}
          _hover={{
            backgroundColor: "gray.700",
          }}
          _active={{
            backgroundColor: "gray.500",
          }}
          type="submit"
          aria-label="Search"
        >
          Search
        </Button>
      </Flex>
    </form>
  );
};
