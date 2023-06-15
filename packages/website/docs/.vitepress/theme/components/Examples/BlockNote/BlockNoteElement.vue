<template>
  <BasicPure :theme="isDark ? 'dark' : 'light'"></BasicPure>
</template>
<script>
import { applyPureReactInVue } from "veaury";
// This is a React component

import { ReactBlockNote } from "./ReactBlockNote";
import { useData } from "vitepress";

export default {
  components: {
    BasicPure: applyPureReactInVue(ReactBlockNote),
  },
  data() {
    return {
      isDark: useData().isDark,
    };
  },
};
</script>
