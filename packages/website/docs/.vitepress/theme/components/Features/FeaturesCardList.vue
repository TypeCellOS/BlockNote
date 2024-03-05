<script setup lang="ts">
import CardList from "@theme/components/CardLists/CardList.vue";
import { featuresCardData } from "../../../../data";
import FeaturesCard from "./FeaturesCard.vue";
</script>

<template>
  <div class="list-container sdfdsf">
    <CardList :columns="4">
      <FeaturesCard
        v-for="(feature, i) of featuresCardData"
        :key="i"
        :feature="feature"
      />
    </CardList>
  </div>
</template>

<style lang="scss" scoped>
.list-container {
  flex: 1;
  width: 100%;
  margin-top: 64px;
}
</style>
