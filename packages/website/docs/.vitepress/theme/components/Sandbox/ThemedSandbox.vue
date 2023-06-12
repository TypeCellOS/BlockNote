<template>
  <div>{{ isDark }}<Sandbox v-bind="props" :isDark="isDark" /></div>
</template>
<script setup>
import { useData } from "vitepress";

const { isDark } = useData();
</script>
<script>
import { sandboxProps } from "vitepress-plugin-sandpack";
import Sandbox from "./Sandbox.vue";

export default {
  name: "ThemedSandbox",
  props: sandboxProps,
  components: {
    Sandbox,
  },
};
</script>
