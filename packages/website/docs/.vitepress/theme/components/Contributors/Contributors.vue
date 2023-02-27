<script setup lang="ts">
import { contributors } from "../../../../contributors";
</script>

<template>
  <div class="contributors">
    <a
      v-for="{ name, avatar } of contributors"
      :key="name"
      :href="`https://github.com/${name}`"
      rel="noopener noreferrer"
      :aria-label="`${name} on GitHub`"
    >
      <img
        loading="lazy"
        :src="avatar"
        width="50"
        height="50"
        :alt="`${name}'s avatar`"
      />
    </a>
  </div>
</template>

<style lang="scss" scoped>
.contributors {
  max-width: 400px;
  display: flex;
  grid-gap: 0.5rem;
  gap: 0.5rem;
  justify-content: center;
  flex-wrap: wrap;
}

.contributors img {
  width: 3rem;
  height: 3rem;
  border-radius: 9999px;
}
</style>
