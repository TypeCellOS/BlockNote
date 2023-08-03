module.exports = {
  root: true,
  extends: ["react-app", "react-app/jest"],
  plugins: ["import"],
  rules: {
    curly: 1,
    "import/no-extraneous-dependencies": [
      "error",
      {
        devDependencies: false,
        optionalDependencies: false,
        peerDependencies: false,
        bundledDependencies: false,
      },
    ],
  },
};
