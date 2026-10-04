import {
  Box,
  Button,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import React, { useEffect } from "react";
import CustomizedInput from "../components/shared/CustomizedInput";
import { IoIosLogIn } from "react-icons/io";
import { toast } from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import Footer from "../components/footer/Footer";

const SignUp = () => {
  const theme = useTheme();
  const isBelowMd = useMediaQuery(theme.breakpoints.down("md"));
  const navigate = useNavigate();
  const auth = useAuth();
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    try {
      toast.loading("Signing Up...", { id: "signup" });
      await auth?.signup(name, email, password);
      toast.success("Signed Up Successfully", { id: "signup" });
    } catch (error) {
      console.log(error);
      toast.error("Signing Up Failed", { id: "signup" });
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
                SignUp
              </Typography>
              <CustomizedInput type="text" name="name" label="Name" />
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
                  bgcolor: "#4592AF",
                  color: "white",
                  fontWeight: "bold",
                  ":hover": {
                    bgcolor: "white",
                    color: "black",
                  },
                }}
                endIcon={<IoIosLogIn />}
              >
                SignUp
              </Button>
            </Box>
          </form>
        </Box>
      </Box>
      <Footer />
    </Box>
  );
};

export default SignUp;
