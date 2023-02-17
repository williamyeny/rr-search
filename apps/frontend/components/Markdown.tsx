import { Box, Button, Collapse, useDimensions } from "@chakra-ui/react";
import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";

export const markdownStyles = {
  ".markdown": {
    color: "gray.700",
    p: {
      my: "0.5rem",
    },
    blockquote: {
      borderLeft: "2px solid",
      borderColor: "gray.200",
      pl: "6px",
      my: "0.5rem",
    },
    img: {
      borderRadius: "8px",
      py: "2px",
    },
    'img[src^="https://files.shroomery.org/smileys/"]': {
      display: "inline",
    },
    a: {
      textDecoration: "underline",
    },
  },
};

const relativeToAbsolute = (url: string) => {
  return url.startsWith("/") ? `https://www.shroomery.org${url}` : url;
};

const MAX_MARKDOWN_HEIGHT = 300;

// Renders markdown.
export const Markdown = ({ children }: { children: string }) => {
  const markdownContainerRef = useRef(null);
  const dimensions = useDimensions(markdownContainerRef, true);
  const contentHeight = dimensions?.borderBox.height ?? 0;
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Box className="markdown">
      <Collapse
        in={contentHeight < MAX_MARKDOWN_HEIGHT || isExpanded}
        startingHeight={MAX_MARKDOWN_HEIGHT}
      >
        <Box ref={markdownContainerRef}>
          <ReactMarkdown
            transformImageUri={relativeToAbsolute}
            transformLinkUri={relativeToAbsolute}
            linkTarget="_blank"
          >
            {children}
          </ReactMarkdown>
        </Box>
      </Collapse>
      {contentHeight > MAX_MARKDOWN_HEIGHT && (
        <Button
          px={4}
          ml={-4}
          mt={-1}
          mb={-3}
          background="none"
          _hover={{ background: "none" }}
          _active={{ background: "none" }}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? "See less" : "See more"}
        </Button>
      )}
    </Box>
  );
};
