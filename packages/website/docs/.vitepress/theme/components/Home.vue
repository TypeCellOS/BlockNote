<script setup lang="ts">
import CTAButton from "@theme/components/Buttons/CTAButton.vue";
// import WCHelloWorld from "@theme/components/Examples/WCHelloWorld.vue";
import Contributors from "@theme/components/Contributors/Contributors.vue";
import FeaturesCardList from "@theme/components/Features/FeaturesCardList.vue";
import Footer from "@theme/components/Footer.vue";
import Hero from "@theme/components/Hero/Hero.vue";
import Sponsors from "@theme/components/Sponsors/Sponsors.vue";
// import ProjectsUsingWCCardList from "@theme/components/WCUsedByProjects/ProjectsUsingWCCardList.vue";
import GithubButton from "vue-github-button";

defineProps<{
  externalLinks: any[];
  footerSections: any[];
}>();
</script>

<template>
  <div class="top-section">
    <Hero />
    <!-- <h3>Battle-tested by cutting-edge teams</h3>
    <WCUsedBy />-->
    <!-- <TestimonialCardList /> -->
  </div>

  <div class="section">
    <!-- <img src="/img/features/elements-01-nodeLIGHT-02-DARK.png" /> -->
    <h2>At a glance:</h2>
    <!-- <p>More text</p> -->
    <FeaturesCardList />
  </div>

  <div class="section love">
    <div class="icon" data-v-6f4cd6f0="">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        class="icon"
        data-v-6f4cd6f0=""
      >
        <path
          d="M12,22.2c-0.3,0-0.5-0.1-0.7-0.3l-8.8-8.8c-2.5-2.5-2.5-6.7,0-9.2c2.5-2.5,6.7-2.5,9.2,0L12,4.3l0.4-0.4c0,0,0,0,0,0C13.6,2.7,15.2,2,16.9,2c0,0,0,0,0,0c1.7,0,3.4,0.7,4.6,1.9l0,0c1.2,1.2,1.9,2.9,1.9,4.6c0,1.7-0.7,3.4-1.9,4.6l-8.8,8.8C12.5,22.1,12.3,22.2,12,22.2zM7,4C5.9,4,4.7,4.4,3.9,5.3c-1.8,1.8-1.8,4.6,0,6.4l8.1,8.1l8.1-8.1c0.9-0.9,1.3-2,1.3-3.2c0-1.2-0.5-2.3-1.3-3.2l0,0C19.3,4.5,18.2,4,17,4c0,0,0,0,0,0c-1.2,0-2.3,0.5-3.2,1.3c0,0,0,0,0,0l-1.1,1.1c-0.4,0.4-1,0.4-1.4,0l-1.1-1.1C9.4,4.4,8.2,4,7,4z"
        ></path>
      </svg>
    </div>
    <p class="intro">
      BlockNote is free and open source, made possible by our sponsors and
      community.
    </p>
    <div class="star">
      <GithubButton
        href="https://github.com/TypeCellOS/BlockNote"
        data-size="large"
        data-show-count="true"
        aria-label="Star TypeCellOS/BlockNote on GitHub"
        >Star</GithubButton
      >
    </div>
    <h3>Sponsors:</h3>
    <Sponsors />
    <h3>Contributors:</h3>
    <Contributors />
    <CTAButton href="https://discord.gg/Qc2QTTH5dF" layout="simple"
      >Join the community and get involved!</CTAButton
    >
  </div>

  <!-- <div class="final-section"> -->
  <div class="section">
    <div class="features-small">
      <div class="feature">
        <h2>Programmable</h2>
        <p>
          BlockNote exposes an extensive API so you can integrate BlockNote into
          your app and add functionality to the editor.
        </p>
      </div>
      <div class="feature">
        <h2>Proven tech</h2>
        <p>
          BlockNote builds on top of Prosemirror and TipTap (two awesome open
          source projects), but is simpler to use. Prosemirror is a
          battle-tested framework, used by top organizations around the world to
          power their text-editing products.
        </p>
      </div>
      <div class="feature">
        <h2>React components</h2>
        <p>
          BlockNote is built for React and exposes easy-to-use components.
          However, it is possible to use BlockNote with other frameworks or
          Vanilla JS (advanced users).
        </p>
      </div>
    </div>
  </div>
  <!-- </div> -->

  <!-- <div class="section">
    <h2>
      Epic
      <strong>Headline</strong>
    </h2>
    <p>Explain cool stuff</p>
    <CTAButton href="/docs/introduction">Get started!</CTAButton>
  </div> -->
  <Footer :sections="footerSections" />
</template>

<style scoped lang="scss">
@import "@theme/styles/vars.scss";

.top-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: -72px;
  padding-top: 276px;
  padding-bottom: 64px;
  // min-height: 100lvh;
  background: linear-gradient(
      180deg,
      rgba(0, 255, 255, 0) 0%,
      rgba(0, 255, 255, 0) 400px,
      rgba(255, 255, 255, 1) 700px
    ),
    radial-gradient(circle at 15% 35%, #dbe4ff, rgba(255, 255, 255, 0) 25%),
    radial-gradient(circle at 85% 20%, #e3fafc, rgba(255, 255, 255, 0) 25%),
    white;
  // background-attachment: fixed;
  // background-image: url("/img/0001-8-2.jpg");
  background-size: cover;
  background-position: center bottom;
  overflow-x: hidden;

  :root.dark & {
    // background-image: url("/img/0001-8-2-dk-bluedk.jpg");
  }

  @media (max-width: 1024px) {
    padding-top: 160px;
  }

  h3 {
    @media (max-width: 1024px) {
      margin-top: 52px;
    }
  }
}

.features-small {
  max-width: var(--content-max-width);
  display: flex;
  flex-wrap: wrap;
  justify-content: space-around;
  gap: 84px 40px;
  margin: 52px 0;
  padding: 0 52px;
  @media (max-width: 600px) {
    padding: 0;
  }
}

.feature {
  max-width: 30%;
  display: flex;
  flex-direction: column;
  gap: 28px;
  @media (max-width: 1200px) {
    max-width: 416px;
  }
  h2 {
    font-family: Gilroy, var(--vp-font-family-base);
    font-size: 28px;
    line-height: 1.1;
    font-weight: 400;
    color: #000;
    :root.dark & {
      color: #fff;
    }
    strong {
      font-weight: 600;
    }
  }
  p {
    max-width: 416px;
    font-size: 15px;
    line-height: 1.8;
    @media (max-width: 680px) {
      max-width: 84%;
      font-size: 15px;
      line-height: 1.8;
    }
    @media (max-width: 680px) {
      max-width: 100%;
    }
    @media (max-width: 500px) {
      font-size: 14px;
    }
  }
}

.section > h2 {
  margin-bottom: 32px;
  font-family: Gilroy, var(--vp-font-family-base);
  font-size: 52px;
  line-height: 1.1;
  font-weight: 400;
  letter-spacing: -0.5px;
  color: #000;
  :root.dark & {
    color: #fff;
  }
  strong {
    font-weight: 600;
  }
  @media (max-width: 680px) {
    margin-bottom: 40px;
    font-size: 34px;
  }
  @media (max-width: 600px) {
    font-size: 30px;
  }
}

.section > p {
  width: 700px;
  max-width: 100%;
  margin-bottom: 52px;
  font-size: 17px;
  line-height: 1.8;
  @media (max-width: 680px) {
    max-width: 84%;
    font-size: 15px;
    line-height: 1.8;
  }
  @media (max-width: 680px) {
    max-width: 100%;
  }
}

h3 {
  margin-bottom: 48px;
  font-family: "Gilroy", sans-serif;
  font-size: 28px;
  font-weight: 400;
  line-height: 1.2;
  text-align: center;
  color: #000;
  :root.dark & {
    color: #fff;
  }
  @media (max-width: 680px) {
    font-size: 26px;
  }
}

h4 {
  margin-bottom: 48px;
  font-family: "Gilroy", sans-serif;
  font-size: 20px;
  font-weight: 400;
  line-height: 1.2;
  text-align: center;
  color: #000;
  :root.dark & {
    color: #fff;
  }
  @media (max-width: 680px) {
    font-size: 26px;
  }

  margin-top: 40px;
}

.section {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: var(--content-max-width);
  padding: 0 18px;
  margin: 100px auto 132px;
  text-align: center;

  @media (max-width: 1024px) {
    margin-top: 0;
  }
}

.final-section {
  background-attachment: fixed;
  // background-image: url("/img/0001-8-2.jpg");
  background-size: cover;
  background-position: center bottom;
  padding: 16px 0;
  :root.dark & {
    // background-image: url("/img/0001-8-2-dk-bluedk.jpg");
  }
}

img {
  max-height: 84px;
  margin-block-end: 24px;
  &.light {
    :root.dark & {
      display: none;
    }
  }
  &.dark {
    :root:not(.dark) & {
      display: none;
    }
  }
}

.external-links {
  padding-bottom: 60px;

  :root.dark & {
    background-image: linear-gradient(
      to top,
      rgba(0, 0, 0, 0.16),
      rgba(0, 0, 0, 0) 360px
    );
  }

  @media (min-width: $bp-medium) {
    padding-top: 20px;
    padding-bottom: 80px;
  }
}
</style>

<!-- global on current page only -->
<style lang="scss">
.VPNavBar.fill .content-body {
  background-color: transparent !important;
}
.VPNavBar {
  transition: 0.2s ease !important;
  transition-property: background-color, backdrop-filter !important;
}
.VPNavBar.fill {
  transition-property: background-color, backdrop-filter !important;
  backdrop-filter: blur(6px) !important;
  background-color: rgba(255, 255, 255, 0.8) !important;
  :root.dark & {
    background-color: rgba(7, 8, 10, 0.8) !important;
  }
}
.VPContent:not(.has-sidebar) {
  padding-top: 0 !important;
}

.love svg {
  width: 40px;
}

.love .intro {
  margin-top: 1em;
  max-width: 350px !important;
  margin-bottom: 26px !important;
}

.love .star {
  margin-bottom: 52px;
}
</style>
