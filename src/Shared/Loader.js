import { Dialog, Slide } from "@mui/material";
import React from "react";

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const Loader = ({ isLoading }) => {
  return (
    <Dialog
      open={isLoading}
      TransitionComponent={Transition}
      keepMounted
      PaperProps={{
        style: {
          backgroundColor: "black",
          boxShadow: "none",
          borderRadius: "1px",
        },
        className: `!p-4 !flex !justify-center !items-center`,
      }}
      BackdropProps={{
        style: {
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          backdropFilter: "blur(2px)",
        },
      }}
    >
      <div className="flex space-x-2">
        <span className="loader-dot animate-pulse-fast"></span>
        <span className="loader-dot animate-pulse-slow"></span>
        <span className="loader-dot animate-pulse-fast"></span>
      </div>
    </Dialog>
  );
};

export default Loader;
