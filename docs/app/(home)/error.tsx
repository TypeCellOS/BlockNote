"use client"; // Error boundaries must be Client Components

import * as Sentry from "@sentry/nextjs";
import { DocsBody } from "fumadocs-ui/layouts/docs/page";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error, {
      tags: { type: "react-render", source: "home" },
    });
  }, [error]);

  return (
    <div className="mx-auto max-w-3xl pt-8">
      <DocsBody>
        <h1>Whoops. What the blocks!?</h1>
        <div>
          We encountered an error trying to show this page. If this keeps
          occuring, an issue can be filed on GitHub at{" "}
          <a href="https://github.com/TypeCellOS/BlockNote/issues">
            https://github.com/TypeCellOS/BlockNote/issues
          </a>
        </div>
      </DocsBody>
    </div>
  );
}
