<script setup lang="ts">
import TodoList from './components/TodoList.vue'
</script>

<template>
  <div class="app-container">
    <TodoList />
  </div>
</template>

<style>
/* 全局样式重置 - 确保没有滚动条 */
html,
body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  overflow: hidden; /* 隐藏整体滚动条 */
  background: transparent !important;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

#app {
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: transparent !important;
  border-radius: 28px;
  clip-path: inset(0 round 28px);
}

* {
  box-sizing: border-box;
}

/* 隐藏所有默认滚动条 */
::-webkit-scrollbar {
  width: 0px;
  background: transparent;
}

/* 但是保留任务列表的滚动条 */
.tasks-section::-webkit-scrollbar {
  width: 6px !important;
  background: transparent;
}
</style>

<style scoped>
.app-container {
  width: 100vw;
  height: 100vh;
  margin: 0;
  padding: 0;
  overflow: hidden;
  background: transparent;
  border-radius: 28px;
  clip-path: inset(0 round 28px);
}
</style>
