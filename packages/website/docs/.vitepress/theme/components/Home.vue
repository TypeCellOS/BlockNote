<script setup lang="ts">
import CTAButton from "@theme/components/Buttons/CTAButton.vue";
// import WCHelloWorld from "@theme/components/Examples/WCHelloWorld.vue";
import FeaturesCardList from "@theme/components/Features/FeaturesCardList.vue";
import Footer from "@theme/components/Footer.vue";
import Hero from "@theme/components/Hero/Hero.vue";
import Sponsors from "@theme/components/Sponsors/Sponsors.vue";
import TestimonialCardList from "@theme/components/Testimonials/TestimonialCardList.vue";
// import ProjectsUsingWCCardList from "@theme/components/WCUsedByProjects/ProjectsUsingWCCardList.vue";

defineProps<{
  externalLinks: any[];
  footerSections: any[];
}>();
</script>

<template>
  <div className="top-section">
    <Hero />
    <!-- <h3>Battle-tested by cutting-edge teams</h3>
    <WCUsedBy />-->
    <TestimonialCardList />
  </div>

  <div className="section">
    <!-- <img src="/img/features/elements-01-nodeLIGHT-02-DARK.png" /> -->
    <h2>Another Headline</h2>
    <p>More text</p>
    <FeaturesCardList />
  </div>

  <div className="section">
    <h3>Gold sponsors:</h3>
    <Sponsors />
  </div>
  <!-- <div className="section example"> -->
  <div className="section">
    <h3>Set up in only a few steps</h3>
    <!-- <WCHelloWorld /> -->
  </div>

  <div className="section">
    <h3>Build rich development experiences not possible before</h3>
    <!-- <ProjectsUsingWCCardList /> -->
  </div>

  <div className="final-section">
    <div className="section">
      <div className="features-small">
        <div className="feature">
          <h2>Feature 1</h2>
          <p>Explain feature 1</p>
        </div>
        <div className="feature">
          <h2>Feature 2</h2>
          <p>Explain feature 2</p>
        </div>
        <div className="feature">
          <h2>Feature 3</h2>
          <p>Explain feature 3</p>
        </div>
      </div>
    </div>
  </div>

  <div className="section">
    <h2>
      Epic
      <strong>Headline</strong>
    </h2>
    <p>Explain cool stuff</p>
    <CTAButton href="/docs/introduction">Get started!</CTAButton>
  </div>
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
  min-height: 100lvh;
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
    @media (max-width: 10240px) {
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
</style>
