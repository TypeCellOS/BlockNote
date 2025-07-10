"use client";

import GHB from "react-github-btn";

export default function GitHubButton() {
  return (
    <GHB
      href="https://github.com/TypeCellOS/BlockNote"
      data-color-scheme="no-preference: light; light: light; dark: dark;"
      data-icon="octicon-star"
      data-size="large"
      data-show-count="true"
      aria-label="Star TypeCellOS/BlockNote on GitHub"
    >
      Star
    </GHB>
  );
}
