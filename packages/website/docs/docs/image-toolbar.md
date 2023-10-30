---
title: Image Toolbar
description: The Image Toolbar appears whenever you select an image that doesn't have a URL, or when you click the "Replace Image" button in the Formatting Toolbar when an image is selected.
imageTitle: Image Toolbar
path: /docs/image-toolbar
---

<script setup>
import { useData } from 'vitepress';
import { getTheme, getStyles } from "../demoUtils";

const { isDark } = useData();
</script>

# Image Toolbar

The Image Toolbar appears whenever you select an image that doesn't have a URL, or when you click the "Replace Image" button in the [Formatting Toolbar](/docs/formatting-toolbar) when an image is selected.

<img style="max-width:600px" :src="isDark ? '/img/screenshots/image_toolbar_dark.png' : '/img/screenshots/image_toolbar.png'" alt="image">

## Image Upload

You may notice that upon creating a new BlockNote editor, the "Upload" tab in the Image Toolbar is missing. This is because you must provide BlockNote with a function to handle file uploads using the `uploadFile` [Editor Option](/docs/editor):

```ts
type uploadFile = (file: File) => Promise<string>;
```

`file:` The file to upload, in this case an image.

`returns:` A `Promise`, which resolves to the URL that the image can be accessed at.

You can use the provided `uploadToTempFilesOrg` function to as a starting point, which uploads files to [tmpfiles.org](https://tmpfiles.org/). However, it's not recommended to use this in a production environment - you should use your own backend:

::: sandbox {template=react-ts}

```typescript-vue /App.tsx
import {
  BlockNoteEditor,
  uploadToTmpFilesDotOrg_DEV_ONLY,
} from "@blocknote/core";
import { BlockNoteView, useBlockNote } from "@blocknote/react";
import "@blocknote/core/style.css";

export default function App() {
  // Creates a new editor instance.
  const editor: BlockNoteEditor = useBlockNote({
    // Sets the example file upload handler.
    uploadFile: uploadToTmpFilesDotOrg_DEV_ONLY,
  });

  return <BlockNoteView editor={editor} theme={"{{ getTheme(isDark) }}"} />;
}
```

```css-vue /styles.css
{{ getStyles(isDark) }}
```

:::
