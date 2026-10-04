import { Avatar, Box, Typography } from "@mui/material";
import React from "react";
import { useAuth } from "../../context/AuthContext";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { coldarkDark } from "react-syntax-highlighter/dist/esm/styles/prism";

function extractCodeFromString(message: string) {
  if (message.includes("```")) {
    const blocks = message.split("```");
    return blocks;
  }
}

function isCodeBlock(str: string) {
  if (
    str.includes("=") ||
    str.includes(";") ||
    str.includes("[") ||
    str.includes("]") ||
    str.includes("{") ||
    str.includes("}") ||
    str.includes("#") ||
    str.includes("//")
  ) {
    return true;
  }
  return false;
}

const ChatItem = ({
  content,
  role,
}: {
  content: string;
  role: "user" | "assistant";
}) => {
  const auth = useAuth();
  const messageBlocks = extractCodeFromString(content);
  return role === "assistant" ? (
    <Box
      sx={{
        display: "flex",
        p: 2,
        bgcolor: "#004d5612",
        gap: 2,
        borderRadius: 2,
        my: 1,
        width: "100%",
        mr: 10,
        pr: 10
      }}
    >
      <Avatar sx={{ ml: "0" }}>
        <img src="openai.png" alt="openai" width={"30px"} />
      </Avatar>
      <Box sx={{ width: "90%" }}>
        {!messageBlocks && (
          <Typography sx={{ fontSize: "20px", whiteSpace: "pre-wrap", mr: 5 }}>
            {content}
          </Typography>
        )}
        {messageBlocks &&
          messageBlocks.length > 0 &&
          messageBlocks.map((block, i) =>
            isCodeBlock(block) ? (
              <SyntaxHighlighter
                key={i}
                style={coldarkDark}
                customStyle={{ marginRight: "50px" }}
                language={block[0]}
              >
                {block}
              </SyntaxHighlighter>
            ) : (
              <Typography
                key={i}
                sx={{ fontSize: "20px", whiteSpace: "pre-wrap", mr: 5 }}
              >
                {block}
              </Typography>
            )
          )}
      </Box>
    </Box>
  ) : (
    <Box
      sx={{
        display: "flex",
        p: 2,
        bgcolor: "#004d56",
        gap: 2,
        borderRadius: 2,
        width: "100%",
      }}
    >
      <Avatar sx={{ ml: "0", bgcolor: "black", color: "white" }}>
        {auth?.user?.name[0]}
        {auth?.user?.name.split(" ")[1][0]}
      </Avatar>
      <Box sx={{ width: "100%" }}>
        {!messageBlocks && (
          <Typography sx={{ fontSize: "20px", whiteSpace: "pre-wrap" }}>
            {content}
          </Typography>
        )}
        {messageBlocks &&
          messageBlocks.length > 0 &&
          messageBlocks.map((block, i) =>
            isCodeBlock(block) ? (
              <SyntaxHighlighter
                key={i}
                style={coldarkDark}
                wrapLines={true}
                customStyle={{ marginRight: "50px" }}
                language={block[0]}
              >
                {block}
              </SyntaxHighlighter>
            ) : (
              <Typography
                key={i}
                sx={{ fontSize: "20px", whiteSpace: "pre-wrap" }}
              >
                {block}
              </Typography>
            )
          )}
      </Box>
    </Box>
  );
};

export default ChatItem;
