import { SearchBar } from "@/components/SearchBar";
import { Box, Container } from "@chakra-ui/react";
import { useRouter } from "next/router";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { PineconeResults, Post } from "types";

export default function Search() {
  const router = useRouter();
  const { query } = router.query;
  const isInvalidQuery = !query || Array.isArray(query);

  useLayoutEffect(() => {
    if (isInvalidQuery) {
      router.push("/");
    }
  }, [query]);

  if (isInvalidQuery) {
    return null;
  }

  const [newQuery, setNewQuery] = useState(query ?? "");
  const [posts, setPosts] = useState<unknown>();

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/search?query=${encodeURIComponent(query)}`);
      const json: PineconeResults = await res.json();
      setPosts(json.matches);
    })();
  }, []);

  return (
    <Box>
      <Box w="100%" mt={8} position="fixed">
        <Container>
          <SearchBar query={newQuery} setQuery={setNewQuery} />
        </Container>
      </Box>
      <Container>
        <Box pt={24}>{JSON.stringify(posts)}</Box>
      </Container>
    </Box>
  );
}
