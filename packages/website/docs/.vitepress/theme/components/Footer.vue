<script setup lang="ts">
interface Section {
  title: string;
  items: { text: string; link: string }[];
}

defineProps<{ sections: Section[] }>();

const year = new Date().getFullYear();
</script>

<template>
  <footer>
    <!-- <div class="sections">
      <div class="section" v-for="section of sections">
        <h4>{{ section.title }}</h4>
        <ul>
          <li v-for="link of section.items">
            <a :href="link.link">{{ link.text }}</a>
          </li>
        </ul>
      </div>
    </div> -->
    <p class="copyright">
      Released under the MPL. © {{ year }} TypeCell & BlockNote contributors.
      Design forked from
      <a href="https://github.com/stackblitz/webcontainer-docs">StackBlitz</a>.
    </p>
  </footer>
</template>

<style scoped lang="scss">
@import "../styles/vars";

footer {
  color: #fff;
  background-color: #131519;
}

.sections {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 30px;
  max-width: 950px;
  margin: 0 auto;
  padding: 40px 24px;

  @media (min-width: 1240px) {
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    padding: 90px 40px;
    max-width: calc(var(--vp-layout-max-width) + 16px);
  }
}

.section {
  h4 {
    margin: 0 0 12px;
    font-size: 12px;
    line-height: 1.3;
    font-weight: 700;
    letter-spacing: 1px;
    text-transform: uppercase;
    @media (min-width: 1000px) {
      margin-bottom: 20px;
    }
  }
  ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }
  li {
    margin: 0 -8px;
    font-size: 13px;
    line-height: 1.3;
  }
  a {
    display: block;
    padding: 4px 8px;
    // The Inter Var Experimental font the default theme is using
    // seems to be thinner than Inter Regular.
    font-weight: 500;
  }
}

.copyright {
  width: 100%;
  padding: 20px;
  text-align: center;
  font-size: 13px;
  line-height: 1.35;
  color: #fff9;
  background: #0006;
}
</style>
