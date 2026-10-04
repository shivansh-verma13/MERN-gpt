import React from "react";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Logo from "./shared/Logo";
import { useAuth } from "../context/AuthContext";
import NavigationLinks from "./shared/NavigationLinks";

const Header = () => {
  const auth = useAuth();
  return (
    <AppBar
      sx={{
        backgroundColor: "transparent",
        position: "static",
        boxShadow: "none",
      }}
    >
      <Toolbar sx={{ display: "flex" }}>
        <Logo />
        <div>
          {auth?.isLoggedIn ? (
            <>
              <NavigationLinks
                bg="#A9C52F"
                to="/chat"
                text="Go To Chat"
                textColor="black"
              />
              <NavigationLinks
                bg="#4592AF"
                to="/"
                text="Logout"
                textColor="white"
                onClick={auth.logout}
              />
            </>
          ) : (
            <>
            <NavigationLinks
                bg="#A9C52F"
                to="/login"
                text="Login"
                textColor="black"
              />
              <NavigationLinks
                bg="#4592AF"
                to="/signup"
                text="Signup"
                textColor="white"
              /></>
          )}
        </div>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
