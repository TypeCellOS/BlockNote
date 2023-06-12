<!-- MySandbox.vue -->
<template>
  <!-- 'code-options' is a build-in prop, do not edit it -->
  <div>
    {{ props.isDark }}
    <ClientOnly>
      <Sandbox
        :rtl="rtl"
        :template="'react-ts'"
        :light-theme="lightTheme"
        :dark-theme="darkTheme"
        :options="{
          ...props, // do not forget it
          showLineNumbers: isDark,
          editorWidthPercentage: 40,
        }"
        :custom-setup="{
          ...props, // do not forget it
          deps: { '@blocknote/react': 'latest' },
        }"
        :code-options="codeOptions"
      >
        <slot />
      </Sandbox>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { Sandbox, sandboxProps } from "vitepress-plugin-sandpack";

const props = defineProps({ ...sandboxProps, isDark: Boolean });
</script>
