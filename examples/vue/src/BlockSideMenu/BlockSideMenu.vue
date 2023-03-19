<script lang="ts" setup>
const props = defineProps<{
  staticParams?: any
}>()

function addBlock() {
  props.staticParams.addBlock()
}
function onDragStart(event: DragEvent) {
  props.staticParams.blockDragStart(event)
}
function onDragEnd(event: DragEvent) {
  props.staticParams.blockDragEnd(event)
}
</script>

<template>
  <div>
    <slot :staticParams="staticParams">
      <slot name="blockSideMenuAddBlock" :staticParams="staticParams">
        <button class="block-side-menu__button" @click="addBlock">
          <svg stroke="currentColor" fill="currentColor" stroke-width="0" t="1551322312294" viewBox="0 0 1024 1024"
            version="1.1" height="24" width="24" xmlns="http://www.w3.org/2000/svg">
            <defs></defs>
            <path d="M474 152m8 0l60 0q8 0 8 8l0 704q0 8-8 8l-60 0q-8 0-8-8l0-704q0-8 8-8Z"></path>
            <path d="M168 474m8 0l672 0q8 0 8 8l0 60q0 8-8 8l-672 0q-8 0-8-8l0-60q0-8 8-8Z"></path>
          </svg>
        </button>
      </slot>

      <slot name="blockSideMenuDrag" :staticParams="staticParams">
        <button class="block-side-menu__button" @dragstart="onDragStart" @dragend="onDragEnd" draggable="true">
          <svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" height="24" width="24"
            xmlns="http://www.w3.org/2000/svg">
            <path fill="none" d="M0 0h24v24H0V0z"></path>
            <path
              d="M11 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm-2-8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z">
            </path>
          </svg>
        </button>
      </slot>
    </slot>
  </div>
</template>

<style>
.block-side-menu {
  position: absolute;
  display: none;
  margin-top: -4px;
}

.block-side-menu>div {
  display: flex !important;
  flex-direction: row;
}

.ProseMirror {
  outline: none;
}
</style>

<style lang="postcss">
.block-side-menu__button {
  -webkit-tap-highlight-color: transparent;
  font-family: Inter;
  cursor: pointer;
  appearance: none;
  font-size: 16px;
  text-align: left;
  text-decoration: none;
  box-sizing: border-box;
  border: 1px solid transparent;
  background-color: transparent;
  color: rgb(194, 199, 208);
  position: relative;
  height: 24px;
  min-height: 24px;
  width: 24px;
  min-width: 24px;
  border-radius: 4px;
  padding: 0px;
  line-height: 1;
  display: flex;
  -webkit-box-align: center;
  align-items: center;
  -webkit-box-pack: center;
  justify-content: center;
}

.block-side-menu__button:hover {
  background-color: rgb(246, 246, 248);
}

.block-side-menu__button:focus {
  outline-offset: 2px;
  outline: rgb(137, 147, 164) solid 2px;
}

button:focus:not(:focus-visible) {
  outline: none !important;
}
</style>
