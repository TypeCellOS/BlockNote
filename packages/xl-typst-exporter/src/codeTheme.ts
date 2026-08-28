/**
 * The syntax-highlighting theme for exported code blocks, mirroring the
 * editor: the code-block package highlights with shiki's `github-dark` on
 * the editor's `#161616` block background (Block.css `codeBlock`). Typst
 * highlights with syntect, which takes TextMate themes - so the editor's
 * look is mirrored by this minimal `.tmTheme` carrying github-dark's token
 * palette. It ships as a virtual compiler file (see
 * {@link TYPST_CODE_THEME_PATH}); `TypstExporter.assetFiles` always includes
 * it, and the preamble's `#set raw(theme: ...)` references it.
 */
export const TYPST_CODE_THEME_PATH = "/assets/code-theme.tmTheme";

const scope = (scopes: string, color: string) => `    <dict>
      <key>scope</key><string>${scopes}</string>
      <key>settings</key><dict><key>foreground</key><string>${color}</string></dict>
    </dict>`;

const CODE_THEME_TMTHEME = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>name</key><string>BlockNote GitHub Dark</string>
  <key>settings</key>
  <array>
    <dict>
      <key>settings</key><dict>
        <key>background</key><string>#161616</string>
        <key>foreground</key><string>#e1e4e8</string>
      </dict>
    </dict>
${scope("comment, punctuation.definition.comment", "#6a737d")}
${scope("string, punctuation.definition.string", "#9ecbff")}
${scope("constant, constant.numeric, support.constant, constant.language", "#79b8ff")}
${scope("keyword, storage, storage.type, keyword.operator", "#f97583")}
${scope("entity.name.function, support.function, meta.function-call", "#b392f0")}
${scope("variable.parameter, variable.other.member, meta.definition.variable", "#ffab70")}
${scope("entity.name.tag, entity.name.type, support.type, support.class", "#85e89d")}
  </array>
</dict>
</plist>
`;

export const TYPST_CODE_THEME_BYTES: Uint8Array = new TextEncoder().encode(
  CODE_THEME_TMTHEME,
);
