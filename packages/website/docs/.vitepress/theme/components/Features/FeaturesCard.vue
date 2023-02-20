<script setup lang="ts">
import Card from "@theme/components/CardLists/Card.vue";
import { useData } from "vitepress";
import type { FeaturesCardData } from "../../../../data";
const { isDark } = useData();
defineProps<{ feature: FeaturesCardData }>();
</script>

<template>
  <Card>
    <div
      class="feature-card"
      :style="{
        backgroundImage: `url(${
          isDark ? feature.bgImgDark : feature.bgImgLight
        })`,
      }"
    >
      <h4>{{ feature.title }}</h4>
      <!-- <p v-html="feature.description" /> -->
    </div>
  </Card>
</template>

<style scoped lang="scss">
.feature-card {
  margin: 5px;
  flex: 1;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 16px;
  width: calc(100% - 10px);
  padding: 28px 28px;
  padding-top: 220px;
  text-align: left;
  background-position: center 4px;
  background-repeat: no-repeat;
  background-size: contain;
  @media (max-width: 1100px) {
    padding-top: 280px;
  }
  @media (max-width: 900px) {
    padding-top: 220px;
  }

  h4 {
    font-weight: 600;
    font-size: 15px;
    line-height: 1.2;
    background: white;
  }

  p {
    font-size: 14px;
    opacity: 0.8;
    line-height: 1.6;
  }
}
</style>
