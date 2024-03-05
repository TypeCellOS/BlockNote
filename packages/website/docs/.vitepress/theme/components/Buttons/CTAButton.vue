<script setup lang="ts">
import { useRouter } from 'vitepress'
const router = useRouter();

defineProps<{
  href: string;
  layout?: 'cta'|'simple';
}>();
</script>

<template>
  <a
    :class="{simple: layout === 'simple'}"
    :href="href"
  >
    <slot />
  </a>
</template>

<style lang="scss" scoped>
a {
  --border-thickness: 1px;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 72px;
  width: min(100%, 300px);
  padding: 4px 8px;
  border-radius: 38px;
  line-height: 1.4;
  font-size: 15px;
  font-weight: 700;
  color: var(--vp-c-text-1);
  --border-thickness: 2px;
  box-shadow:
    inset 0 1px 0 0 rgba(0,0,0,0.1),
    inset 0 0 0 var(--border-thickness) var(--vp-c-text-1);
  backdrop-filter: blur(4px);
  transition: 0.16s ease;
  transition-property: background-color, border-color, box-shadow, color, transform;

  :root.dark & {
    --border-thickness: 1px;
    box-shadow:
      inset 0 1px 0 0 rgba(255, 255, 255, 0.16),
      inset 0 0 0 var(--border-thickness) rgba(255,255,255,0.16);
    background-color: var(--wc-background-soft-light);
  }
  :root.dark &:hover {
    background-color: transparent;
    box-shadow:
      inset 0 1px 0 0 rgba(255,255,255,0.1),
      inset 0 0 0 var(--border-thickness) var(--vp-c-brand-lighter),
      0 0 24px -10px var(--vp-c-brand-lighter);
  }

  &:hover {
    --border-thickness: 1px;
    background-color: #fff;
    box-shadow:
      inset 0 1px 0 0 rgba(255,255,255,0.1),
      inset 0 0 0 var(--border-thickness) var(--vp-c-brand-lighter),
      0 0 24px -10px var(--vp-c-brand-lighter);
    transform: translateY(-2px);
  }

  &.simple {
    width: min(100%, 200px);
    text-underline-offset: 2px;
    box-shadow: none !important;
    text-decoration: underline;
    background-color: transparent !important;
    backdrop-filter: none;
    &:hover {
      color: var(--vp-c-brand);
    }
  }
}
</style>
