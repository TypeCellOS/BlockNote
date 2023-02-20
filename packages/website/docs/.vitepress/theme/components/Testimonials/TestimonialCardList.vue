<script lang="ts">
export default {
  mounted() {
    this.updateAll();
    window.addEventListener("resize", this.resizeHandler);
    this.$refs.testimonialWrapper?.addEventListener(
      "scroll",
      this.scrollHandler
    );
  },
  unmounted() {
    window.removeEventListener("resize", this.resizeHandler);
    this.$refs.testimonialWrapper?.removeEventListener(
      "scroll",
      this.scrollHandler
    );
  },
  data() {
    return {
      cardColumns: 3,
      cardGap: 12,
      newCardWidth: 0,
      testimonialsWrapperClientWidth: 0,
      testimonialsWrapperScrollLeft: 0,
      testimonialsWrapperMaxScrollLeft: 0,
    };
  },
  methods: {
    resizeHandler() {
      this.updateAll();
    },
    scrollHandler() {
      this.updateWrapperScrollLeft();
    },
    scrollNext() {
      this.$refs.testimonialWrapper.scrollLeft +=
        this.$data.newCardWidth + this.$data.cardGap;
    },
    scrollPrevious() {
      this.$refs.testimonialWrapper.scrollLeft -=
        this.$data.newCardWidth + this.$data.cardGap;
    },
    updateCardColumns() {
      // get window width
      const windowWidth =
        window.innerWidth && document.documentElement.clientWidth
          ? Math.min(window.innerWidth, document.documentElement.clientWidth)
          : window.innerWidth ||
            document.documentElement.clientWidth ||
            document.getElementsByTagName("body")[0].clientWidth;
      // update cardColumns based on screen size
      if (windowWidth > 1100) {
        this.$data.cardColumns = 3;
      }
      if (windowWidth > 600 && windowWidth <= 1100) {
        this.$data.cardColumns = 2;
      }
      if (windowWidth <= 600) {
        this.$data.cardColumns = 1;
      }
    },
    updateCardWidth() {
      const newCardWidth =
        // derive card width from wrapper width
        this.$data.testimonialsWrapperClientWidth / this.$data.cardColumns -
        // account for column gaps and hidden pixel
        (this.$data.cardGap * (this.$data.cardColumns - 1)) /
          this.$data.cardColumns -
        1;
      // update newCardWidth with whole number
      this.$data.newCardWidth = Math.round(newCardWidth);
    },
    updateAll() {
      this.updateWrapperClientWidth();
      this.updateCardColumns();
      this.updateCardWidth();
      this.updateWrapperScrollLeft();
    },
    updateWrapperClientWidth() {
      this.$data.testimonialsWrapperClientWidth =
        this.$refs.testimonialWrapper.clientWidth;
    },
    updateWrapperScrollLeft() {
      this.$data.testimonialsWrapperScrollLeft =
        this.$refs.testimonialWrapper.scrollLeft;
      this.$data.testimonialsWrapperMaxScrollLeft =
        this.$refs.testimonialWrapper.scrollWidth -
        this.$refs.testimonialWrapper.clientWidth;
    },
  },
};
</script>

<script setup lang="ts">
import CardList from "@theme/components/CardLists/CardList.vue";
import { testimonialCardData } from "../../../../data";
import TestimonialCard from "./TestimonialCard.vue";
</script>

<template>
  <div class="slider-wrapper">
    <div class="testimonials-wrapper" ref="testimonialWrapper">
      <CardList :noWrap="true">
        <TestimonialCard
          v-for="(testimonial, i) of testimonialCardData"
          :key="i"
          :testimonial="testimonial"
          :width="newCardWidth"
        />
      </CardList>
    </div>
  </div>
  <div class="slider-nav">
    <button
      :class="`scroll-button previous ${
        testimonialsWrapperScrollLeft === 0 ? 'disabled' : ''
      }`"
      @click="scrollPrevious"
    />
    <span
      class="slider-list-item-rep"
      v-for="cardData of testimonialCardData"
    />
    <button
      :class="`scroll-button next ${
        testimonialsWrapperScrollLeft === testimonialsWrapperMaxScrollLeft
          ? 'disabled'
          : ''
      }`"
      @click="scrollNext"
    />
  </div>
</template>

<style scoped lang="scss">
.slider-wrapper {
  position: relative;
  width: calc(var(--content-max-width) - 80px);
  max-width: 100%;
  padding: 0 12px;
}
.testimonials-wrapper {
  display: flex;
  width: 100%;
  overflow-x: hidden;
  scroll-behavior: smooth;
}

.slider-nav {
  position: relative;
  display: flex;
  align-items: center;
  margin: 32px 0;
  gap: 8px;
}

.slider-list-item-rep {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.32);

  :root.dark & {
    background: rgba(255, 255, 255, 0.32);
  }
}
.scroll-button {
  width: 40px;
  height: 40px;
  margin: 0 8px;
  background-color: rgb(111, 115, 118);
  transition: 0.2s ease;
  transition-property: opacity;
  -webkit-mask-position: center;
  mask-position: center;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  -webkit-mask-size: 18px;
  mask-size: 18px;
  -webkit-mask-image: url("/icons/fa-arrow-right-light.svg");
  mask-image: url("/icons/fa-arrow-right-light.svg");
  :root.dark & {
    background-color: rgba(255, 255, 255, 0.6);
  }
  &.previous {
    transform: rotate(180deg);
  }
  &:hover:not(.disabled) {
    background-color: rgba(0, 0, 0, 0.9);
    :root.dark & {
      background-color: #fff;
    }
  }

  &.disabled {
    opacity: 0.4;
    cursor: default;
  }
}
</style>
