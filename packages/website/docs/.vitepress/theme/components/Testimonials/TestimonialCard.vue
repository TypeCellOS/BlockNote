<script setup lang="ts">
import Card from "@theme/components/CardLists/Card.vue";
import type { TestimonialCardData } from "../../../../data";
defineProps<{
  testimonial: TestimonialCardData;
  width?: number;
}>();
</script>

<template>
  <Card>
    <div
      class="testimonial-card"
      :style="width ? { '--card-width': `${width}px` } : {}"
    >
      <img
        v-if="testimonial.imgPath?.logo"
        class="company-logo"
        :src="testimonial.imgPath?.logo"
      />
      <img
        v-if="testimonial.imgPath?.logoLight"
        class="company-logo-theme light"
        :src="testimonial.imgPath?.logoLight"
      />
      <img
        v-if="testimonial.imgPath?.logoDark"
        class="company-logo-theme dark"
        :src="testimonial.imgPath?.logoDark"
      />
      <p class="quote" v-html="testimonial.quote" />
      <div class="author">
        <div v-if="testimonial.imgPath?.author" class="author__images">
          <img :src="testimonial.imgPath?.author" />
        </div>
        <div class="author__info">
          <p class="author__name">{{ testimonial.author.name }}</p>
          <p
            v-if="testimonial.author.title"
            class="author__title"
            v-html="testimonial.author.title"
          />
        </div>
      </div>
    </div>
  </Card>
</template>

<style scoped lang="scss">
.testimonial-card {
  --card-width: 475px;
  flex: 1;
  width: var(--card-width);
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 28px;
  padding: 44px 36px;
  @media (max-width: 500px) {
    gap: 24px;
    padding: 40px 26px;
  }
}

.quote {
  flex: 1;
  max-width: 100%;
  font-size: 15px;
  font-weight: 500;
  line-height: 1.6;
  &::before,
  &::after {
    content: '"';
  }
  :root.dark & {
    color: rgba(255, 255, 255, 0.84);
  }
  @media (max-width: 500px) {
    font-size: 14px;
    line-height: 1.8;
  }
}

.company-logo,
.company-logo-theme {
  display: flex;
  flex: 0;
  max-width: 140px;
  max-height: 30px;
  justify-content: flex-start;
  &.wider {
    max-width: 164px;
  }
}

.company-logo-theme {
  &.dark {
    display: none;
    :root.dark & {
      display: flex;
    }
  }
  &.light {
    display: flex;
    :root.dark & {
      display: none;
    }
  }
}

.company-logo {
  :root.dark & {
    filter: invert(1) contrast(1);
  }
}

.author {
  display: flex;
  align-items: center;
  gap: 20px;
}
.author__images {
  img {
    width: 34px;
    border-radius: 50%;
  }
}
.author__info {
  display: flex;
  flex-direction: column;
  line-height: 1.4;
}
.author__name {
  font-size: 15px;
  font-weight: 600;
}
.author__title {
  font-size: 14px;
  font-weight: 500;
  opacity: 0.7;
}
</style>

Non-scoped
<style lang="scss">
.quote strong {
  font-weight: 700;
  :root.dark & {
    color: #fff;
  }
}
.author__title a {
  text-decoration: underline;
}
</style>
