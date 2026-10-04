import { TextField, useTheme, useMediaQuery } from "@mui/material";
import React from "react";

type Props = {
  name: string;
  type: string;
  label: string;
};

const CustomizedInput = (props: Props) => {
  const theme = useTheme();
  const isBelowMd = useMediaQuery(theme.breakpoints.down("md"));
  return (
    <TextField
      margin="normal"
      InputLabelProps={{ style: { color: "white" } }}
      InputProps={{
        style: {
          width: !isBelowMd ? "400px" : "100%",
          borderRadius: 10,
          fontSize: 20,
          color: "white",
        },
      }}
      name={props.name}
      label={props.label}
      type={props.type}
    />
  );
};

export default CustomizedInput;
