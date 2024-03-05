<template>
  <div ref="el"></div>
</template>

<script setup>
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { ref, onMounted, onUnmounted, watchEffect } from "vue";
import { ReactBlockNote } from "./ReactBlockNote"; // Replace with your actual React component
import { useData } from "vitepress";

const el = ref(null);
const isDark = useData().isDark;
let root = null;

onMounted(() => {
  if (el.value) {
    root = createRoot(el.value);
    renderReactComponent();
  }
});

onUnmounted(() => {
  if (root) {
    console.log("unmount");
    root.unmount();
  }
});

// Reactively update the React component when Vue data changes
watchEffect(() => {
  console.log("effect", isDark.value);
  if (root) {
    renderReactComponent();
  }
});

function renderReactComponent() {
  // console.log("render", isDark.value);
  root.render(
    createElement(
      ReactBlockNote,
      { theme: isDark.value ? "dark" : "light" },
      null
    )
  );
}
</script>
