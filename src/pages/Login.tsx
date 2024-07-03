import {
  Box,
  Button,
  Typography,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import React, { useEffect } from "react";
import CustomizedInput from "../components/shared/CustomizedInput";
import { IoIosLogIn } from "react-icons/io";
import { toast } from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import Footer from "../components/footer/Footer";

const Login = () => {
  const theme = useTheme();
  const isBelowMd = useMediaQuery(theme.breakpoints.down("md"));
  const navigate = useNavigate();
  const auth = useAuth();
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    try {
      toast.loading("Signing In...", { id: "login" });
      await auth?.login(email, password);
      toast.success("Signed In Successfully", { id: "login" });
    } catch (error) {
      console.log(error);
      toast.error("Signing In Failed", { id: "login" });
    }
  };

  useEffect(() => {
    if (auth?.user) {
      navigate("/chat");
    }
  }, [auth, navigate]);

  return (
    <Box width={"100%"} height={"100%"}>
      <Box width={"100%"} height={"100%"} display="flex" flex={1}>
        <Box padding={8} display={{ md: "flex", sm: "none", xs: "none" }}>
          <img src="airobot.png" alt="roboto-img" style={{ width: "400px" }} />
        </Box>
        <Box
          display={"flex"}
          flex={{ xs: 1, md: 0.5 }}
          justifyContent={"center"}
          alignItems={"center"}
          padding={2}
          // ml={"18%"}
          mt={0}
          sx={{ ml: { md: "18%", sm: 0, xs: 0 } }}
        >
          <form
            onSubmit={handleSubmit}
            style={{
              margin: "auto",
              marginTop: "25%",
              padding: "20px",
              boxShadow: "10px 10px 20px #000",
              borderRadius: "10px",
              border: "none",
              width: isBelowMd ? "100%" : "",
            }}
          >
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
              }}
            >
              <Typography
                variant="h4"
                textAlign="center"
                padding={2}
                fontWeight={600}
              >
                Login
              </Typography>
              <CustomizedInput type="email" name="email" label="Email" />
              <CustomizedInput
                type="password"
                name="password"
                label="Password"
              />
              <Button
                type="submit"
                sx={{
                  px: 2,
                  py: 1,
                  mt: 2,
                  width: !isBelowMd ? "400px" : "100%",
                  borderRadius: 2,
                  bgcolor: "#A9C52F",
                  fontWeight: "bold",
                  color: "white",
                  ":hover": {
                    bgcolor: "white",
                    color: "black",
                  },
                }}
                endIcon={<IoIosLogIn />}
              >
                Login
              </Button>
            </Box>
          </form>
        </Box>
      </Box>
      <Footer />
    </Box>
  );
};

export default Login;
