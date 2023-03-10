<template>
  <BasicPure></BasicPure>
</template>
<script>
import { applyPureReactInVue } from "veaury";
// This is a React component

import { ReactBlockNote } from "./ReactBlockNote";
import { ref } from "vue";

export default {
  components: {
    BasicPure: applyPureReactInVue(ReactBlockNote),
  },
  setup() {
    return {
      // foo: ref("Hello!"),
    };
  },
};
</script>
