<template>
  <BlockNote></BlockNote>
</template>
<script>
import { computed, defineAsyncComponent } from "vue";
import { inBrowser } from "vitepress";

export default {
  components: {
    BlockNote: defineAsyncComponent(() =>
      inBrowser ? import("./BlockNoteElement.vue") : null
    ),
  },
};
</script>
