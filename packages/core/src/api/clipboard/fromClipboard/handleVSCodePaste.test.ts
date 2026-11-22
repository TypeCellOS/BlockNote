// @vitest-environment node
import { describe, expect, it } from "vite-plus/test";

import { textToCodeBlockHTML } from "./handleVSCodePaste.js";

describe("textToCodeBlockHTML", () => {
  it("does not change code that has no HTML characters", () => {
    expect(
      textToCodeBlockHTML("const a = 1;\nconst b = 'two';", "typescript"),
    ).toBe(
      `<pre><code class="language-typescript">const a = 1;\nconst b = 'two';</code></pre>`,
    );
  });

  it("escapes `<` and `>` in the text", () => {
    expect(
      textToCodeBlockHTML("const a: Array<string> = [];", "typescript"),
    ).toBe(
      `<pre><code class="language-typescript">const a: Array&lt;string&gt; = [];</code></pre>`,
    );
  });

  it("escapes `&` in the text", () => {
    expect(textToCodeBlockHTML("a &lt; b && c", "html")).toBe(
      `<pre><code class="language-html">a &amp;lt; b &amp;&amp; c</code></pre>`,
    );
  });

  it("escapes the closing tags of a code block in the text", () => {
    expect(textToCodeBlockHTML("</code></pre><h1>Title</h1>", "html")).toBe(
      `<pre><code class="language-html">&lt;/code&gt;&lt;/pre&gt;&lt;h1&gt;Title&lt;/h1&gt;</code></pre>`,
    );
  });

  it("escapes a quote in the language", () => {
    expect(textToCodeBlockHTML("const a = 1;", `a"b`)).toBe(
      `<pre><code class="language-a&quot;b">const a = 1;</code></pre>`,
    );
  });
});
