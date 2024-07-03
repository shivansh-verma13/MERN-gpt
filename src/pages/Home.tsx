import { Box, useMediaQuery, useTheme } from "@mui/material";
import React from "react";
import TypingAnimation from "../components/typer/TypingAnimation";
import Footer from "../components/footer/Footer";

const Home = () => {
  const theme = useTheme();
  const isBelowMd = useMediaQuery(theme.breakpoints.down("md"));
  return (
    <Box width={"100%"} height={"100%"}>
      <Box
        sx={{
          display: "flex",
          width: "100%",
          flexDirection: "column",
          alignItems: "center",
          mx: "auto",
          mt: 3,
        }}
      >
        <Box sx={{ textAlign: { xs: "center" } }}>
          <TypingAnimation />
        </Box>
        <Box
          sx={{
            width: "100%",
            display: "flex",
            flexDirection: { md: "row", xs: "column", sm: "column" },
            gap: 5,
            my: 10,
          }}
        >
          <img
            className="image-inverted rotate"
            src="openai.png"
            alt="openai"
            style={{ width: "150px", margin: "auto" }}
          />
          <img
            src="chatfront.png"
            alt="chatbot"
            style={{
              display: "flex",
              margin: "auto",
              width: isBelowMd ? "80%" : "60%",
              borderRadius: "20px",
              boxShadow: "-5px -5px 105px #64f3d5",
              marginTop: 20,
              marginBottom: 20,
            }}
          />
        </Box>
        <Box
          sx={{
            display: "flex",
            width: "100%",
            mx: "auto",
            gap: 5,
            my: 10,
            flexDirection: { md: "row", xs: "column", sm: "column" },
          }}
        >
          <img
            src="chat.png"
            alt="chatbot"
            style={{
              display: "flex",
              margin: "auto",
              width: isBelowMd ? "80%" : "60%",
              borderRadius: "20px",
              boxShadow: "-5px -5px 105px #64f3d5",
              marginTop: 20,
              marginBottom: 20,
            }}
          />

          <img
            src="robot.png"
            alt="robot"
            style={{
              width: "150px",
              margin: "auto",
            }}
          />
        </Box>
      </Box>
      <Footer />
    </Box>
  );
};

export default Home;