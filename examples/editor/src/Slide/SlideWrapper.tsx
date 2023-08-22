import React from "react";

const SlideWrapper = ({ children }: { children: React.ReactNode }) => {
  const slideStyles = {
    width: "100%",
    height: "400px",
    maxHeight: "400px",
    backgroundColor: "#f1f1f1",
    boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
  };

  return <div style={slideStyles}>{children}</div>;
};

export default SlideWrapper;
