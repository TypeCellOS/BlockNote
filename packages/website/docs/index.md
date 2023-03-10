---
layout: page
title: BlockNote - Javascript Block-Based text editor
# head:
#   - [
#       "meta",
#       {
#         property: "og:image",
#         content: "",
#       },
#     ]

hero:
  name: BlockNote
  text: The open source Block-Based rich text editor
  tagline: A beautiful text editor that just works. Easily add an editor to your app that users will love. Customize it with your own functionality like custom blocks or AI tooling.

  #   image:
  #     src: /logo.png
  #     alt: VitePress
  # actions:
  #   - theme: brand
  #     text: Get Started
  #     link: /docs
  #   - theme: alt
  #     text: View on GitHub
  #     link: https://github.com/yousefed/blocknote
---

<script setup lang="ts">
import Home from '@theme/components/Home.vue';

import { footerSections } from './data';
</script>

<Home
  :externalLinks=[]
  :footerSections="footerSections"
/>
