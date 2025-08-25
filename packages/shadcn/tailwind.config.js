/** @type {import('tailwindcss').Config} */
const dir = __dirname + "/src";
module.exports = {
  content: [dir + "/**/*.{ts,tsx}"],
  prefix: "bn",
};
