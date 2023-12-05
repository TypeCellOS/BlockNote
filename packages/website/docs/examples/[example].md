---
layout: page
---

<script setup>
// import { path } from 'path'
import { useData } from 'vitepress'
import { Playground } from '../components/playground'	
import { examples } from '../components/files'	
// import { ExamplePlaygroundLazy } from '../components/example-playground-lazy'

const dir = "../../../../examples/basic";
const { params } = useData()
const example = params.value.example

// const file =  import("../../../../examples/basic/main.tsx?raw" );
// file.then(f => {
//     console.log(f);
//     debugger;
// })
// const file = examples.basic.files();
// const file2 = examples["react-custom-styles"].files();
// debugger;
const files = import.meta.glob("../../../../examples/basic/**/*", { as: 'raw', eager: true });
const passedFiles = Object.fromEntries(Object.entries(files).map(([fullPath, content]) => {
    const filename = fullPath.substring(dir.length)
    return [filename, {
        filename,
        code: content
    }];
}));
console.log("files", passedFiles);
</script>

<!-- README -->
<Playground :files="passedFiles" />
