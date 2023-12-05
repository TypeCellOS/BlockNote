export const examples = {
  basic: {
    files: () => {
      debugger;
      return import.meta.glob("../../../../examples/basic/**/*", {
        as: "raw",
        eager: false,
      });
    },
  },
  "react-custom-styles": {
    files: () => {
      debugger;
      return import.meta.glob("../../../../examples/react-custom-styles/**/*", {
        as: "raw",
        eager: false,
      });
    },
  },
};
