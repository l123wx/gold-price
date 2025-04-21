<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const cacheList = ref<string[]>(['Index'])

onMounted(() => {
  // 如果用户直接访问根路径，重定向到/index
  if (window.location.hash === '#/') {
    router.push('/index')
  }
})
</script>

<template>
  <router-view v-slot="{ Component, route }">
    <keep-alive :include="cacheList">
      <component :is="Component" v-if="!route.meta.link" :key="route.path" />
    </keep-alive>
  </router-view>
</template>

<style>
/* 全局样式 */
html, body {
  margin: 0;
  padding: 0;
  height: 100%;
  width: 100%;
  overflow: hidden;
  background-color: #fff;
  color: #333;
  font-family: Arial, sans-serif;
}

#app {
  height: 100%;
  width: 100%;
  overflow: hidden;
}
</style>
