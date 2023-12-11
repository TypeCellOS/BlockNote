---
path: /examples/saving-loading
---

<script setup>
import { useData } from 'vitepress'
import { Playground } from '../components/playground'	
import { examples } from '../components/files'	

const dir = "../../../../examples/saving-loading";
const { params } = useData()

const files = import.meta.glob("../../../../examples/saving-loading/**/*", { as: 'raw', eager: true });
const passedFiles = Object.fromEntries(Object.entries(files).map(([fullPath, content]) => {
    const filename = fullPath.substring(dir.length)
    return [filename, {
        filename,
        code: content,
        hidden: filename.endsWith(".md") || filename.endsWith("main.tsx"),
    }];
}));

</script>

# Saving & Loading

In this example, we save the editor contents to local storage whenever a change is made, and load the saved contents when the editor is created.

See this in action by typing in the editor and reloading the page!

**Relevant Docs:**

- [Editor Options](/docs/editor#editor-options)
- [Accessing Blocks](/docs/manipulating-blocks#accessing-blocks)


<Playground :files="passedFiles" />
