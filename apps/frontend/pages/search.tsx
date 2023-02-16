import { SearchBar } from "@/components/SearchBar";
import { Box, Container } from "@chakra-ui/react";
import { useRouter } from "next/router";
import { useState } from "react";

export default function Search() {
  const router = useRouter();
  const { query } = router.query;
  if (!query || Array.isArray(query)) return null;

  const [newQuery, setNewQuery] = useState(query ?? "");

  return (
    <Container>
      <Box w="100%" mt={8}>
        <SearchBar query={newQuery} setQuery={setNewQuery} />
      </Box>
    </Container>
  );
}
