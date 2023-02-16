import { SearchBar } from "@/components/SearchBar";
import { Box, Container } from "@chakra-ui/react";
import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";
import { Post } from "types";

export default function Search() {
  const router = useRouter();
  const { query } = router.query;
  if (!query || Array.isArray(query)) return null;

  const [newQuery, setNewQuery] = useState(query ?? "");
  const [posts, setPosts] = useState<Post[]>([]);

  const [data, setData] = useState("");
  useEffect(() => {
    (async () => {
      const res = await fetch("/api/hello");
      const json = await res.json();
      setData(json.name);
    })();
  }, []);

  return (
    <Container>
      <Box w="100%" mt={8}>
        <SearchBar query={newQuery} setQuery={setNewQuery} />
      </Box>
      {data}
    </Container>
  );
}
