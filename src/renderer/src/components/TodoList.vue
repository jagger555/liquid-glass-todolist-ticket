<template>
  <div
    :class="['todo-container', { 'dark-theme': isDarkTheme, 'desktop-mode': isDesktopMode }]"
    tabindex="0"
    @contextmenu="showContextMenu"
    @keydown="handleKeydown"
  >
    <!-- 标题栏 -->
    <div class="title-bar" :class="{ draggable: isWindowMovable }" @mousedown="startDrag">
      <div class="title">
        <i class="icon-note"></i>
        <span>便签 TodoList</span>
      </div>
      <div class="window-controls">
        <button
          :class="{ active: isAlwaysOnTop }"
          class="control-btn pin-btn"
          title="切换置顶"
          @click="toggleAlwaysOnTop"
        >
          📌
        </button>
        <button
          :class="{ active: isDesktopMode }"
          class="control-btn desktop-btn"
          title="底层穿透模式 Ctrl+Alt+D"
          @click="toggleDesktopMode"
        >
          ⇣
        </button>
        <button
          :class="{ active: !isWindowMovable }"
          class="control-btn lock-btn"
          title="切换拖动锁定"
          @click="toggleWindowMovable"
        >
          {{ isWindowMovable ? '🔓' : '🔒' }}
        </button>
        <button class="control-btn theme-btn" title="切换主题" @click="toggleTheme">
          {{ isDarkTheme ? '🌙' : '☀️' }}
        </button>
        <button class="control-btn" @click="minimizeWindow">➖</button>
        <button class="control-btn close-btn" @click="closeWindow">✕</button>
      </div>
    </div>

    <!-- 快速操作栏 -->
    <div class="quick-actions">
      <button
        class="quick-action-btn add-toggle-btn"
        :class="{ active: showAddSection }"
        title="添加任务"
        @click="toggleAddSection"
      >
        <span class="btn-icon">{{ showAddSection ? '✕' : '➕' }}</span>
        <span class="btn-text">{{ showAddSection ? '收起' : '添加' }}</span>
      </button>

      <button
        v-if="tasks.length > 0"
        class="quick-action-btn search-toggle-btn"
        :class="{ active: showSearchSection }"
        title="搜索任务"
        @click="toggleSearchSection"
      >
        <span class="btn-icon">{{ showSearchSection ? '✕' : '🔍' }}</span>
        <span class="btn-text">{{ showSearchSection ? '收起' : '搜索' }}</span>
      </button>
    </div>

    <!-- 可展开的添加任务区域 -->
    <div v-if="showAddSection" class="expandable-section add-task-section">
      <div class="input-container">
        <input
          ref="taskInput"
          v-model="newTask"
          placeholder="输入新任务内容..."
          class="task-input"
          @keyup.enter="addTask"
          @keyup.esc="closeAddSection"
        />
        <button class="add-btn" :disabled="!newTask.trim()" @click="addTask">
          <span>添加</span>
        </button>
      </div>
    </div>

    <!-- 可展开的搜索区域 -->
    <div v-if="showSearchSection && tasks.length > 0" class="expandable-section search-section">
      <div class="search-container">
        <input
          ref="searchInput"
          v-model="searchQuery"
          placeholder="搜索任务内容..."
          class="search-input"
          @keyup.esc="closeSearchSection"
        />
        <button v-if="searchQuery" class="clear-search-btn" title="清除搜索" @click="clearSearch">
          ✕
        </button>
      </div>
    </div>

    <!-- 任务列表 -->
    <div class="tasks-section">
      <div v-if="tasks.length === 0" class="empty-state">
        <div class="empty-icon">📝</div>
        <p>还没有任务，添加一个开始吧！</p>
      </div>

      <div v-else ref="tasksList" class="tasks-list">
        <div
          v-for="task in filteredTasks"
          :key="task.id"
          :data-id="task.id"
          :class="[
            'task-item',
            {
              completed: task.completed,
              editing: task.editing,
              draggable: !searchQuery && currentFilter === 'all'
            }
          ]"
        >
          <div class="task-main-row">
            <div class="task-content">
              <button
                :class="['task-checkbox', { checked: task.completed }]"
                @click="toggleTask(task.id)"
              >
                <span v-if="task.completed">✓</span>
              </button>

              <div v-if="!task.editing" class="task-text-block">
                <div class="task-text" @dblclick="startEdit(task)">
                  {{ task.text }}
                </div>
                <div v-if="task.subtasks.length > 0" class="subtask-summary">
                  {{ getCompletedSubtaskCount(task) }}/{{ task.subtasks.length }} 子任务
                </div>
              </div>

              <input
                v-else
                ref="editInput"
                v-model="task.text"
                class="task-edit-input"
                @keyup.enter="finishEdit(task)"
                @blur="finishEdit(task)"
                @keyup.esc="cancelEdit(task)"
              />
            </div>

            <div class="task-actions">
              <button
                class="action-btn subtask-toggle-btn"
                :class="{ active: activeSubtaskTaskId === task.id }"
                title="添加子任务"
                @click="toggleSubtaskInput(task.id)"
              >
                ＋
              </button>
              <button
                v-if="!task.editing"
                class="action-btn edit-btn"
                title="编辑"
                @click="startEdit(task)"
              >
                ✏️
              </button>
              <button class="action-btn delete-btn" title="删除" @click="deleteTask(task.id)">
                🗑️
              </button>
            </div>
          </div>

          <div
            v-if="task.subtasks.length > 0 || activeSubtaskTaskId === task.id"
            class="subtasks-panel"
          >
            <div v-if="task.subtasks.length > 0" class="subtasks-progress">
              <span>{{ getCompletedSubtaskCount(task) }}/{{ task.subtasks.length }} 已完成</span>
              <span class="subtasks-progress-track">
                <span
                  class="subtasks-progress-fill"
                  :style="{ width: `${getSubtaskProgress(task)}%` }"
                ></span>
              </span>
            </div>

            <div v-if="task.subtasks.length > 0" class="subtask-list">
              <div
                v-for="subtask in task.subtasks"
                :key="subtask.id"
                :class="['subtask-item', { completed: subtask.completed }]"
              >
                <button
                  :class="['subtask-check', { checked: subtask.completed }]"
                  @click="toggleSubtask(task.id, subtask.id)"
                >
                  <span v-if="subtask.completed">✓</span>
                </button>
                <span class="subtask-text">{{ subtask.text }}</span>
                <button
                  class="subtask-delete-btn"
                  title="删除子任务"
                  @click="deleteSubtask(task.id, subtask.id)"
                >
                  ✕
                </button>
              </div>
            </div>

            <div v-if="activeSubtaskTaskId === task.id" class="subtask-input-row">
              <input
                :ref="(el) => setSubtaskInputRef(task.id, el as HTMLInputElement | null)"
                v-model="subtaskDrafts[task.id]"
                class="subtask-input"
                placeholder="添加子任务..."
                @keyup.enter="addSubtask(task.id)"
                @keyup.esc="closeSubtaskInput(task.id)"
              />
              <button
                class="subtask-add-btn"
                :disabled="!subtaskDrafts[task.id]?.trim()"
                @click="addSubtask(task.id)"
              >
                添加
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部统计和过滤 -->
    <div class="stats-section">
      <!-- 统计信息 -->
      <div class="stats-container">
        <div class="stat-card">
          <div class="stat-number">{{ tasks.length }}</div>
          <div class="stat-label">总计</div>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-card completed">
          <div class="stat-number">{{ completedCount }}</div>
          <div class="stat-label">已完成</div>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-card pending">
          <div class="stat-number">{{ pendingCount }}</div>
          <div class="stat-label">待办</div>
        </div>
      </div>

      <!-- 过滤按钮 -->
      <div class="filter-container">
        <button
          v-for="filter in filters"
          :key="filter.key"
          :class="['filter-btn', { active: currentFilter === filter.key }]"
          @click="currentFilter = filter.key"
        >
          <span class="filter-icon">{{ filter.icon }}</span>
          <span class="filter-text">{{ filter.label }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch, onUnmounted } from 'vue'
import Sortable from 'sortablejs'

// 任务接口定义
interface SubTask {
  id: string
  text: string
  completed: boolean
  createdAt: Date
}

interface Task {
  id: string
  text: string
  completed: boolean
  createdAt: Date
  subtasks: SubTask[]
  editing?: boolean
  originalText?: string
}

// 响应式数据
const tasks = ref<Task[]>([])
const newTask = ref('')
const searchQuery = ref('')
const currentFilter = ref<'all' | 'pending' | 'completed'>('all')
const isAlwaysOnTop = ref(false)
const isDesktopMode = ref(false)
const isDarkTheme = ref(false)
const isWindowMovable = ref(true)
const taskInput = ref<HTMLInputElement>()
const searchInput = ref<HTMLInputElement>()
const editInput = ref<HTMLInputElement[]>()
const tasksList = ref<HTMLElement>()
const activeSubtaskTaskId = ref<string | null>(null)
const subtaskDrafts = ref<Record<string, string>>({})
const subtaskInputRefs = ref<Record<string, HTMLInputElement | null>>({})

// 展开状态控制
const showAddSection = ref(false)
const showSearchSection = ref(false)

// 过滤选项
const filters = [
  { key: 'all' as const, label: '全部', icon: '📋' },
  { key: 'pending' as const, label: '待办', icon: '⏳' },
  { key: 'completed' as const, label: '已完成', icon: '✅' }
]

// 计算属性
const filteredTasks = computed(() => {
  let filtered = tasks.value

  // 按状态过滤
  switch (currentFilter.value) {
    case 'pending':
      filtered = filtered.filter((task) => !task.completed)
      break
    case 'completed':
      filtered = filtered.filter((task) => task.completed)
      break
  }

  // 按搜索关键词过滤
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase().trim()
    filtered = filtered.filter(
      (task) =>
        task.text.toLowerCase().includes(query) ||
        task.subtasks.some((subtask) => subtask.text.toLowerCase().includes(query))
    )
  }

  return filtered
})

const completedCount = computed(() => tasks.value.filter((task) => task.completed).length)
const pendingCount = computed(() => tasks.value.filter((task) => !task.completed).length)

// 展开/收起控制方法
const toggleAddSection = (): void => {
  showAddSection.value = !showAddSection.value
  if (showAddSection.value) {
    showSearchSection.value = false
    nextTick(() => {
      taskInput.value?.focus()
    })
  }
}

const toggleSearchSection = (): void => {
  showSearchSection.value = !showSearchSection.value
  if (showSearchSection.value) {
    showAddSection.value = false
    nextTick(() => {
      searchInput.value?.focus()
    })
  }
}

const closeAddSection = (): void => {
  showAddSection.value = false
  newTask.value = ''
}

const closeSearchSection = (): void => {
  showSearchSection.value = false
  searchQuery.value = ''
}

const clearSearch = (): void => {
  searchQuery.value = ''
}

// 方法
const createId = (): string => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

const setSubtaskInputRef = (taskId: string, el: HTMLInputElement | null): void => {
  subtaskInputRefs.value[taskId] = el
}

const getCompletedSubtaskCount = (task: Task): number =>
  task.subtasks.filter((subtask) => subtask.completed).length

const getSubtaskProgress = (task: Task): number => {
  if (task.subtasks.length === 0) return 0
  return Math.round((getCompletedSubtaskCount(task) / task.subtasks.length) * 100)
}

const toggleSubtaskInput = (taskId: string): void => {
  activeSubtaskTaskId.value = activeSubtaskTaskId.value === taskId ? null : taskId
  if (activeSubtaskTaskId.value === taskId) {
    subtaskDrafts.value[taskId] ??= ''
    nextTick(() => {
      subtaskInputRefs.value[taskId]?.focus()
    })
  }
}

const closeSubtaskInput = (taskId: string): void => {
  if (activeSubtaskTaskId.value === taskId) {
    activeSubtaskTaskId.value = null
  }
  subtaskDrafts.value[taskId] = ''
}

const addSubtask = (taskId: string): void => {
  const task = tasks.value.find((item) => item.id === taskId)
  const text = subtaskDrafts.value[taskId]?.trim()
  if (!task || !text) return

  task.subtasks.push({
    id: createId(),
    text,
    completed: false,
    createdAt: new Date()
  })

  subtaskDrafts.value[taskId] = ''
  saveData()

  nextTick(() => {
    subtaskInputRefs.value[taskId]?.focus()
  })
}

const toggleSubtask = (taskId: string, subtaskId: string): void => {
  const task = tasks.value.find((item) => item.id === taskId)
  const subtask = task?.subtasks.find((item) => item.id === subtaskId)
  if (!subtask) return

  subtask.completed = !subtask.completed
  saveData()
}

const deleteSubtask = (taskId: string, subtaskId: string): void => {
  const task = tasks.value.find((item) => item.id === taskId)
  if (!task) return

  const index = task.subtasks.findIndex((item) => item.id === subtaskId)
  if (index > -1) {
    task.subtasks.splice(index, 1)
    saveData()
  }
}

const addTask = (): void => {
  const text = newTask.value.trim()
  if (!text) return

  const task: Task = {
    id: createId(),
    text,
    completed: false,
    createdAt: new Date(),
    subtasks: []
  }

  tasks.value.unshift(task)
  newTask.value = ''
  showAddSection.value = false // 添加完成后自动收起
  saveData()
}

const toggleTask = (id: string): void => {
  const task = tasks.value.find((t) => t.id === id)
  if (task) {
    task.completed = !task.completed
    saveData()
  }
}

const deleteTask = (id: string): void => {
  const index = tasks.value.findIndex((t) => t.id === id)
  if (index > -1) {
    tasks.value.splice(index, 1)
    saveData()
  }
}

const startEdit = (task: Task): void => {
  task.originalText = task.text
  task.editing = true
  nextTick(() => {
    const input = editInput.value?.find((el) => el)
    input?.focus()
    input?.select()
  })
}

const finishEdit = (task: Task): void => {
  const text = task.text.trim()
  if (text) {
    task.editing = false
    delete task.originalText
    saveData()
  } else {
    cancelEdit(task)
  }
}

const cancelEdit = (task: Task): void => {
  if (task.originalText !== undefined) {
    task.text = task.originalText
  }
  task.editing = false
  delete task.originalText
}

// 拖拽排序
let sortableInstance: Sortable | null = null

const initSortable = (): void => {
  // 销毁现有实例
  if (sortableInstance) {
    sortableInstance.destroy()
    sortableInstance = null
  }

  // 只在全部视图且无搜索时启用拖拽
  if (tasksList.value && !searchQuery.value && currentFilter.value === 'all') {
    sortableInstance = Sortable.create(tasksList.value, {
      animation: 150,
      ghostClass: 'sortable-ghost',
      chosenClass: 'sortable-chosen',
      dragClass: 'sortable-drag',
      handle: '.task-main-row', // 指定拖拽手柄
      onEnd: (evt) => {
        const { oldIndex, newIndex } = evt
        if (oldIndex !== undefined && newIndex !== undefined && oldIndex !== newIndex) {
          const movedTask = tasks.value.splice(oldIndex, 1)[0]
          tasks.value.splice(newIndex, 0, movedTask)
          saveData()
        }
      }
    })
  }
}

// 窗口控制
const toggleAlwaysOnTop = async (): Promise<void> => {
  try {
    const newState = await window.api.toggleAlwaysOnTop()
    isAlwaysOnTop.value = newState
    if (newState) {
      isDesktopMode.value = false
    }
  } catch (error) {
    console.error('切换置顶状态失败:', error)
  }
}

const toggleDesktopMode = async (): Promise<void> => {
  try {
    const enabled = await window.api.toggleDesktopMode()
    isDesktopMode.value = enabled
    if (enabled) {
      isAlwaysOnTop.value = false
    }
  } catch (error) {
    console.error('切换底层穿透模式失败:', error)
  }
}

// 主题切换
const toggleTheme = (): void => {
  isDarkTheme.value = !isDarkTheme.value
  // 保存主题设置到本地存储
  localStorage.setItem('todolist-theme', isDarkTheme.value ? 'dark' : 'light')
}

const minimizeWindow = async (): Promise<void> => {
  try {
    await window.api.minimizeWindow()
  } catch (error) {
    console.error('最小化窗口失败:', error)
  }
}

const closeWindow = async (): Promise<void> => {
  try {
    await window.api.closeWindow()
  } catch (error) {
    console.error('关闭窗口失败:', error)
  }
}

// 拖拽功能
const startDrag = (event: MouseEvent): void => {
  // 只有在允许拖动时才处理拖拽
  if (!isWindowMovable.value) {
    event.preventDefault()
    event.stopPropagation()
    return
  }
  // 阻止默认行为，让 Electron 处理窗口拖拽
  event.preventDefault()
}

// 窗口拖动控制
const toggleWindowMovable = async (): Promise<void> => {
  try {
    const newState = await window.api.toggleWindowMovable()
    isWindowMovable.value = newState
  } catch (error) {
    console.error('切换拖动状态失败:', error)
  }
}

// 右键菜单
const showContextMenu = async (event: MouseEvent): Promise<void> => {
  event.preventDefault()
  try {
    await window.api.showContextMenu(event.clientX, event.clientY, isDarkTheme.value)
  } catch (error) {
    console.error('显示右键菜单失败:', error)
  }
}

// 键盘快捷键处理
const handleKeydown = (event: KeyboardEvent): void => {
  // Ctrl/Cmd + N: 切换添加任务区域
  if ((event.ctrlKey || event.metaKey) && event.key === 'n') {
    event.preventDefault()
    toggleAddSection()
  }

  // Ctrl/Cmd + F: 切换搜索区域
  if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
    event.preventDefault()
    if (tasks.value.length > 0) {
      toggleSearchSection()
    }
  }

  // Ctrl/Cmd + T: 切换置顶
  if ((event.ctrlKey || event.metaKey) && event.key === 't') {
    event.preventDefault()
    toggleAlwaysOnTop()
  }

  // Ctrl/Cmd + Alt + D: 切换底层穿透模式
  if ((event.ctrlKey || event.metaKey) && event.altKey && event.key.toLowerCase() === 'd') {
    event.preventDefault()
    toggleDesktopMode()
  }

  // Ctrl/Cmd + M: 最小化
  if ((event.ctrlKey || event.metaKey) && event.key === 'm') {
    event.preventDefault()
    minimizeWindow()
  }

  // Escape: 取消编辑状态
  if (event.key === 'Escape') {
    if (activeSubtaskTaskId.value) {
      closeSubtaskInput(activeSubtaskTaskId.value)
    }

    tasks.value.forEach((task) => {
      if (task.editing) {
        cancelEdit(task)
      }
    })
  }
}

// 数据持久化
const saveData = async (): Promise<void> => {
  try {
    // 过滤掉临时属性，只保存核心数据
    const dataToSave = tasks.value.map(task => ({
      id: task.id,
      text: task.text,
      completed: task.completed,
      createdAt: task.createdAt,
      subtasks: task.subtasks.map((subtask) => ({
        id: subtask.id,
        text: subtask.text,
        completed: subtask.completed,
        createdAt: subtask.createdAt
      }))
    }))

    await window.api.saveData(dataToSave)
  } catch (error) {
    console.error('保存数据失败:', error)
  }
}

const loadData = async (): Promise<void> => {
  try {
    const data = await window.api.loadData()
    if (data && Array.isArray(data)) {
      tasks.value = data.map((task) => ({
        id: task.id ?? createId(),
        text: task.text ?? '',
        completed: Boolean(task.completed),
        createdAt: new Date(task.createdAt),
        subtasks: Array.isArray(task.subtasks)
          ? task.subtasks.map((subtask) => ({
              id: subtask.id ?? createId(),
              text: subtask.text ?? '',
              completed: Boolean(subtask.completed),
              createdAt: new Date(subtask.createdAt)
            }))
          : []
      }))
    }
  } catch (error) {
    console.error('加载数据失败:', error)
  }
}

// 生命周期
onMounted(() => {
  loadData()

  // 加载主题设置
  const savedTheme = localStorage.getItem('todolist-theme')
  isDarkTheme.value = savedTheme === 'dark'

  // 初始化拖拽排序
  nextTick(() => {
    initSortable()
  })

  // 监听主进程的状态变化
  window.api.onAlwaysOnTopChanged((isOnTop) => {
    isAlwaysOnTop.value = isOnTop
  })

  window.api.onOpacityChanged(() => {
    // 可以在这里添加透明度变化的视觉反馈
  })

  window.api.onWindowMovableChanged((isMovable) => {
    isWindowMovable.value = isMovable
  })

  window.api.onDesktopModeChanged((enabled) => {
    isDesktopMode.value = enabled
    if (enabled) {
      isAlwaysOnTop.value = false
    }
  })

  window.api.onToggleTheme(() => {
    toggleTheme()
  })
})

// 监听过滤条件和搜索查询的变化，重新初始化拖拽
watch([currentFilter, searchQuery], () => {
  nextTick(() => {
    initSortable()
  })
})

// 监听任务列表变化，确保拖拽功能正常
watch(
  tasks,
  () => {
    nextTick(() => {
      initSortable()
    })
  },
  { deep: true }
)

// 组件卸载时清理事件监听器
onUnmounted(() => {
  // 清理Sortable实例
  if (sortableInstance) {
    sortableInstance.destroy()
    sortableInstance = null
  }

  // 清理事件监听器
  window.api.removeAllListeners('always-on-top-changed')
  window.api.removeAllListeners('opacity-changed')
  window.api.removeAllListeners('window-movable-changed')
  window.api.removeAllListeners('desktop-mode-changed')
  window.api.removeAllListeners('toggle-theme')
})
</script>

<style scoped>
.todo-container {
  width: 100%;
  height: 100vh;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* 标题栏样式 */
.title-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: linear-gradient(90deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%);
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;
  cursor: move;
  -webkit-app-region: drag;
}

.title-bar:not(.draggable) {
  cursor: default;
  -webkit-app-region: no-drag;
  background: linear-gradient(90deg, rgba(156, 163, 175, 0.1) 0%, rgba(107, 114, 128, 0.1) 100%);
}

.title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
}

.icon-note::before {
  content: '📝';
  font-size: 16px;
}

.window-controls {
  display: flex;
  gap: 4px;
  -webkit-app-region: no-drag;
}

.control-btn {
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.05);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  transition: all 0.2s ease;
}

.control-btn:hover {
  background: rgba(0, 0, 0, 0.1);
  transform: scale(1.05);
}

.pin-btn.active {
  background: rgba(99, 102, 241, 0.2);
  color: #6366f1;
}

.lock-btn.active {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

.close-btn:hover {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

/* 快速操作栏 */
.quick-actions {
  display: flex;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.4);
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  backdrop-filter: blur(8px);
}

.quick-action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.7);
  color: #374151;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  backdrop-filter: blur(4px);
}

.quick-action-btn:hover {
  background: rgba(255, 255, 255, 0.9);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.quick-action-btn.active {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.9) 0%, rgba(168, 85, 247, 0.9) 100%);
  color: white;
  border-color: rgba(99, 102, 241, 0.3);
}

.quick-action-btn .btn-icon {
  font-size: 14px;
  line-height: 1;
}

.quick-action-btn .btn-text {
  font-size: 11px;
  font-weight: 600;
}

/* 可展开区域 */
.expandable-section {
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.6);
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  backdrop-filter: blur(10px);
  animation: slideDown 0.2s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
    max-height: 0;
  }
  to {
    opacity: 1;
    transform: translateY(0);
    max-height: 100px;
  }
}

/* 搜索区域样式 */

.search-container {
  position: relative;
  display: flex;
  align-items: center;
}

.search-input {
  flex: 1;
  padding: 10px 16px;
  padding-right: 40px;
  border: 2px solid rgba(0, 0, 0, 0.08);
  border-radius: 8px;
  font-size: 13px;
  background: rgba(255, 255, 255, 0.9);
  transition: all 0.2s ease;
}

.search-input:focus {
  outline: none;
  border-color: rgba(99, 102, 241, 0.5);
  background: rgba(255, 255, 255, 1);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.clear-search-btn {
  position: absolute;
  right: 8px;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 50%;
  background: rgba(107, 114, 128, 0.1);
  color: #6b7280;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.clear-search-btn:hover {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.input-container {
  display: flex;
  gap: 8px;
  align-items: center;
}

.task-input {
  flex: 1;
  padding: 12px 16px;
  border: 2px solid rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  font-size: 14px;
  background: rgba(255, 255, 255, 0.8);
  transition: all 0.2s ease;
}

.task-input:focus {
  outline: none;
  border-color: #6366f1;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.add-btn {
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  transition: all 0.2s ease;
  min-width: 60px;
}

.add-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
}

.add-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 任务列表区域 */
.tasks-section {
  flex: 1;
  overflow-y: auto;
  padding: 6px 8px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: #9ca3af;
  text-align: center;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.tasks-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.task-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 8px;
  border: 1px solid rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;
  animation: slideIn 0.3s ease;
}

.task-item:hover {
  background: rgba(255, 255, 255, 0.8);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.task-item.completed {
  opacity: 0.7;
  background: rgba(34, 197, 94, 0.1);
}

.task-item.editing {
  background: rgba(99, 102, 241, 0.1);
  border-color: #6366f1;
}

.task-content {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.task-checkbox {
  width: 20px;
  height: 20px;
  border: 2px solid #d1d5db;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  font-size: 12px;
  color: white;
}

.task-checkbox:hover {
  border-color: #6366f1;
}

.task-checkbox.checked {
  background: #22c55e;
  border-color: #22c55e;
}

.task-text {
  flex: 1;
  font-size: 14px;
  color: #374151;
  cursor: pointer;
  padding: 4px 0;
  word-break: break-word;
}

.task-item.completed .task-text {
  text-decoration: line-through;
  color: #9ca3af;
}

.task-edit-input {
  flex: 1;
  padding: 4px 8px;
  border: 1px solid #6366f1;
  border-radius: 4px;
  font-size: 14px;
  background: white;
}

.task-edit-input:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
}

.task-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.task-item:hover .task-actions {
  opacity: 1;
}

.action-btn {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.05);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background: rgba(0, 0, 0, 0.1);
  transform: scale(1.1);
}

.delete-btn:hover {
  background: rgba(239, 68, 68, 0.2);
}

.edit-btn:hover {
  background: rgba(99, 102, 241, 0.2);
}

/* 拖拽排序样式 */
.sortable-ghost {
  opacity: 0.4;
  background: rgba(99, 102, 241, 0.1);
}

.sortable-chosen {
  transform: scale(1.02);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.sortable-drag {
  transform: rotate(5deg);
  opacity: 0.8;
}

.task-item.draggable {
  cursor: move;
}

.task-item.draggable:hover {
  cursor: move;
  background: rgba(99, 102, 241, 0.05);
}

.task-item:not(.draggable) {
  cursor: default;
}

/* 底部统计区域 */
.stats-section {
  padding: 12px 16px;
  border-top: 1px solid rgba(0, 0, 0, 0.08);
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(12px);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* 统计信息容器 */
.stats-container {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
}

.stat-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 8px;
  border: 1px solid rgba(0, 0, 0, 0.05);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transition: all 0.2s ease;
  min-width: 50px;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.stat-number {
  font-size: 16px;
  font-weight: 700;
  color: #374151;
  line-height: 1;
}

.stat-card.completed .stat-number {
  color: #10b981;
}

.stat-card.pending .stat-number {
  color: #f59e0b;
}

.stat-label {
  font-size: 10px;
  color: #6b7280;
  margin-top: 2px;
  font-weight: 500;
}

.stat-divider {
  width: 1px;
  height: 20px;
  background: linear-gradient(to bottom, transparent, rgba(0, 0, 0, 0.1), transparent);
}

/* 过滤按钮容器 */
.filter-container {
  display: flex;
  justify-content: center;
  gap: 6px;
}

.filter-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.8);
  color: #374151;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  backdrop-filter: blur(8px);
}

.filter-btn:hover {
  background: rgba(255, 255, 255, 0.95);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.filter-btn.active {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
  border-color: #6366f1;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
}

.filter-icon {
  font-size: 14px;
}

.filter-text {
  font-size: 12px;
}

/* 动画效果 */
@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* 任务列表区域的美化滚动条 */
.tasks-section::-webkit-scrollbar {
  width: 6px;
}

.tasks-section::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.05);
  border-radius: 3px;
}

.tasks-section::-webkit-scrollbar-thumb {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.6) 0%, rgba(168, 85, 247, 0.6) 100%);
  border-radius: 3px;
  transition: all 0.2s ease;
}

.tasks-section::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.8) 0%, rgba(168, 85, 247, 0.8) 100%);
  transform: scaleX(1.2);
}

/* 响应式设计 */
@media (max-height: 600px) {
  .todo-container {
    border-radius: 8px;
  }

  .add-task-section,
  .stats-section {
    padding: 8px 12px;
  }

  .stats-container {
    gap: 6px;
  }

  .stat-card {
    padding: 6px 10px;
    min-width: 45px;
  }

  .stat-number {
    font-size: 14px;
  }

  .filter-container {
    gap: 4px;
  }

  .filter-btn {
    padding: 6px 10px;
    font-size: 11px;
  }

  .task-item {
    padding: 8px;
  }
}

/* 深色主题样式 */
.todo-container.dark-theme {
  background: linear-gradient(135deg, rgba(31, 41, 55, 0.95) 0%, rgba(17, 24, 39, 0.95) 100%);
  border-color: rgba(75, 85, 99, 0.3);
}

.dark-theme .title-bar.draggable {
  background: linear-gradient(90deg, rgba(99, 102, 241, 0.2) 0%, rgba(168, 85, 247, 0.2) 100%);
  border-bottom-color: rgba(75, 85, 99, 0.3);
}

.dark-theme .title-bar:not(.draggable) {
  background: linear-gradient(90deg, rgba(75, 85, 99, 0.2) 0%, rgba(55, 65, 81, 0.2) 100%);
  border-bottom-color: rgba(75, 85, 99, 0.3);
}

.dark-theme .title {
  color: #f3f4f6;
}

.dark-theme .control-btn {
  color: #d1d5db;
}

.dark-theme .control-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.dark-theme .pin-btn.active {
  background: rgba(99, 102, 241, 0.3);
  color: #a5b4fc;
}

.dark-theme .lock-btn.active {
  background: rgba(239, 68, 68, 0.3);
  color: #fca5a5;
}

.dark-theme .task-input,
.dark-theme .search-input {
  background: rgba(31, 41, 55, 0.8);
  border-color: rgba(75, 85, 99, 0.5);
  color: #f3f4f6;
}

.dark-theme .task-input:focus,
.dark-theme .search-input:focus {
  background: rgba(31, 41, 55, 0.95);
}

.dark-theme .task-input::placeholder,
.dark-theme .search-input::placeholder {
  color: #9ca3af;
}

.dark-theme .task-item {
  background: rgba(31, 41, 55, 0.6);
  border-color: rgba(75, 85, 99, 0.3);
}

.dark-theme .task-item:hover {
  background: rgba(31, 41, 55, 0.8);
}

.dark-theme .task-text {
  color: #f3f4f6;
}

.dark-theme .stats-section {
  background: rgba(17, 24, 39, 0.6);
  border-top-color: rgba(75, 85, 99, 0.3);
}

.dark-theme .stat-card {
  background: rgba(31, 41, 55, 0.8);
  border-color: rgba(75, 85, 99, 0.3);
}

.dark-theme .stat-card:hover {
  background: rgba(31, 41, 55, 0.9);
}

.dark-theme .stat-number {
  color: #f3f4f6;
}

.dark-theme .stat-card.completed .stat-number {
  color: #34d399;
}

.dark-theme .stat-card.pending .stat-number {
  color: #fbbf24;
}

.dark-theme .stat-label {
  color: #9ca3af;
}

.dark-theme .stat-divider {
  background: linear-gradient(to bottom, transparent, rgba(75, 85, 99, 0.3), transparent);
}

.dark-theme .filter-btn {
  background: rgba(31, 41, 55, 0.8);
  border-color: rgba(75, 85, 99, 0.5);
  color: #d1d5db;
}

.dark-theme .filter-btn:hover {
  background: rgba(31, 41, 55, 0.95);
}

.dark-theme .filter-btn.active {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
  border-color: #6366f1;
}

.dark-theme .empty-state {
  color: #9ca3af;
}

/* 深色主题 - 快速操作栏 */
.dark-theme .quick-actions {
  background: rgba(17, 24, 39, 0.6);
  border-bottom-color: rgba(75, 85, 99, 0.3);
}

.dark-theme .quick-action-btn {
  background: rgba(31, 41, 55, 0.8);
  border-color: rgba(75, 85, 99, 0.5);
  color: #d1d5db;
}

.dark-theme .quick-action-btn:hover {
  background: rgba(31, 41, 55, 0.9);
}

.dark-theme .quick-action-btn.active {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.9) 0%, rgba(168, 85, 247, 0.9) 100%);
  color: white;
  border-color: rgba(99, 102, 241, 0.5);
}

/* 深色主题 - 可展开区域 */
.dark-theme .expandable-section {
  background: rgba(17, 24, 39, 0.7);
  border-bottom-color: rgba(75, 85, 99, 0.3);
}

.dark-theme .task-input,
.dark-theme .search-input {
  background: rgba(31, 41, 55, 0.8);
  border-color: rgba(75, 85, 99, 0.5);
  color: #f3f4f6;
}

.dark-theme .task-input:focus,
.dark-theme .search-input:focus {
  background: rgba(31, 41, 55, 0.9);
  border-color: rgba(99, 102, 241, 0.6);
}

.dark-theme .clear-search-btn {
  background: rgba(75, 85, 99, 0.3);
  color: #9ca3af;
}

.dark-theme .clear-search-btn:hover {
  background: rgba(239, 68, 68, 0.2);
  color: #f87171;
}

/* 深色主题滚动条样式 */
.dark-theme .tasks-section::-webkit-scrollbar-track {
  background: rgba(75, 85, 99, 0.2);
}

.dark-theme .tasks-section::-webkit-scrollbar-thumb {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.7) 0%, rgba(168, 85, 247, 0.7) 100%);
}

.dark-theme .tasks-section::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.9) 0%, rgba(168, 85, 247, 0.9) 100%);
}

/* 深色主题拖拽样式 */
.dark-theme .task-item.draggable:hover {
  background: rgba(99, 102, 241, 0.1);
}

.dark-theme .sortable-ghost {
  background: rgba(99, 102, 241, 0.2);
}

/* Liquid glass visual layer */
.todo-container {
  --glass-ink: #223047;
  --glass-muted: rgba(60, 72, 90, 0.66);
  --glass-panel: rgba(255, 255, 255, 0.46);
  --glass-panel-strong: rgba(255, 255, 255, 0.66);
  --glass-edge: rgba(255, 255, 255, 0.72);
  --glass-inner-edge: rgba(255, 255, 255, 0.38);
  --glass-shadow: rgba(22, 37, 58, 0.18);
  --glass-accent: #6557f5;
  --glass-accent-2: #00a8d8;
  --glass-success: #20c879;
  --glass-warning: #f29f05;

  position: relative;
  isolation: isolate;
  color: var(--glass-ink);
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.64), rgba(238, 247, 255, 0.3)),
    rgba(255, 255, 255, 0.28);
  border: 1px solid rgba(255, 255, 255, 0.7);
  border-radius: 18px;
  box-shadow:
    0 28px 70px rgba(11, 25, 44, 0.28),
    0 8px 24px rgba(66, 85, 110, 0.16),
    inset 0 1px 0 rgba(255, 255, 255, 0.85),
    inset 0 -1px 0 rgba(255, 255, 255, 0.18);
  backdrop-filter: blur(34px) saturate(190%);
  -webkit-backdrop-filter: blur(34px) saturate(190%);
  font-family:
    'Segoe UI Variable',
    'SF Pro Display',
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    sans-serif;
}

.todo-container::before,
.todo-container::after {
  position: absolute;
  inset: 0;
  content: '';
  pointer-events: none;
}

.todo-container::before {
  z-index: 0;
  background:
    radial-gradient(circle at 16% 8%, rgba(255, 255, 255, 0.9) 0 8%, transparent 28%),
    radial-gradient(circle at 84% 14%, rgba(0, 190, 216, 0.32) 0 12%, transparent 34%),
    radial-gradient(circle at 15% 78%, rgba(99, 87, 245, 0.28) 0 16%, transparent 42%),
    radial-gradient(circle at 78% 86%, rgba(32, 200, 121, 0.22) 0 12%, transparent 36%),
    linear-gradient(150deg, rgba(255, 255, 255, 0.38), rgba(255, 255, 255, 0.06) 46%, rgba(180, 230, 255, 0.24));
  filter: blur(0.2px);
}

.todo-container::after {
  z-index: 2;
  border-radius: inherit;
  background:
    linear-gradient(115deg, rgba(255, 255, 255, 0.72) 0%, transparent 18%, transparent 74%, rgba(255, 255, 255, 0.24) 100%),
    repeating-linear-gradient(105deg, rgba(255, 255, 255, 0.14) 0 1px, transparent 1px 7px);
  mix-blend-mode: soft-light;
  opacity: 0.42;
}

.todo-container > * {
  position: relative;
  z-index: 1;
}

.title-bar,
.quick-actions,
.expandable-section,
.stats-section {
  background: rgba(255, 255, 255, 0.22);
  border-color: rgba(255, 255, 255, 0.42);
  backdrop-filter: blur(28px) saturate(180%);
  -webkit-backdrop-filter: blur(28px) saturate(180%);
}

.title-bar {
  padding: 10px 14px 8px;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.64),
    0 10px 30px rgba(25, 42, 65, 0.08);
}

.title-bar:not(.draggable) {
  background: rgba(230, 235, 242, 0.28);
}

.title {
  color: var(--glass-ink);
  font-size: 15px;
  letter-spacing: 0;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.55);
}

.window-controls {
  gap: 6px;
}

.control-btn,
.action-btn,
.clear-search-btn {
  border: 1px solid rgba(255, 255, 255, 0.44);
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.62), rgba(255, 255, 255, 0.24)),
    rgba(255, 255, 255, 0.28);
  color: var(--glass-ink);
  box-shadow:
    0 7px 16px rgba(24, 42, 66, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.72),
    inset 0 -1px 0 rgba(255, 255, 255, 0.26);
  backdrop-filter: blur(18px) saturate(180%);
  -webkit-backdrop-filter: blur(18px) saturate(180%);
}

.control-btn {
  width: 31px;
  height: 31px;
  border-radius: 10px;
}

.control-btn:hover,
.action-btn:hover,
.clear-search-btn:hover {
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.78), rgba(255, 255, 255, 0.34)),
    rgba(255, 255, 255, 0.42);
  box-shadow:
    0 10px 24px rgba(24, 42, 66, 0.16),
    inset 0 1px 0 rgba(255, 255, 255, 0.82),
    inset 0 -1px 0 rgba(255, 255, 255, 0.24);
}

.pin-btn.active {
  background: linear-gradient(145deg, rgba(112, 99, 246, 0.42), rgba(255, 255, 255, 0.24));
  color: #4f46e5;
}

.lock-btn.active,
.close-btn:hover {
  background: linear-gradient(145deg, rgba(255, 111, 111, 0.42), rgba(255, 255, 255, 0.22));
  color: #dc2626;
}

.quick-actions {
  padding: 11px 16px 10px;
  gap: 10px;
}

.quick-action-btn,
.filter-btn {
  min-height: 34px;
  border: 1px solid rgba(255, 255, 255, 0.54);
  border-radius: 999px;
  background:
    linear-gradient(150deg, rgba(255, 255, 255, 0.7), rgba(255, 255, 255, 0.26)),
    rgba(255, 255, 255, 0.34);
  color: var(--glass-ink);
  box-shadow:
    0 10px 24px rgba(25, 42, 65, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.8),
    inset 0 -1px 0 rgba(255, 255, 255, 0.24);
  backdrop-filter: blur(22px) saturate(180%);
  -webkit-backdrop-filter: blur(22px) saturate(180%);
}

.quick-action-btn:hover,
.filter-btn:hover {
  background:
    linear-gradient(150deg, rgba(255, 255, 255, 0.84), rgba(255, 255, 255, 0.36)),
    rgba(255, 255, 255, 0.44);
  box-shadow:
    0 14px 30px rgba(25, 42, 65, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.88),
    inset 0 -1px 0 rgba(255, 255, 255, 0.24);
}

.quick-action-btn.active,
.filter-btn.active {
  border-color: rgba(255, 255, 255, 0.64);
  background:
    radial-gradient(circle at 24% 12%, rgba(255, 255, 255, 0.64), transparent 34%),
    linear-gradient(135deg, rgba(101, 87, 245, 0.92), rgba(0, 168, 216, 0.72));
  color: #fff;
  box-shadow:
    0 16px 34px rgba(43, 72, 180, 0.28),
    inset 0 1px 0 rgba(255, 255, 255, 0.66),
    inset 0 -1px 0 rgba(10, 40, 120, 0.18);
}

.expandable-section {
  padding: 14px 16px;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.4),
    0 12px 28px rgba(25, 42, 65, 0.08);
}

.task-input,
.search-input,
.task-edit-input {
  border: 1px solid rgba(255, 255, 255, 0.58);
  border-radius: 14px;
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.72), rgba(255, 255, 255, 0.28)),
    rgba(255, 255, 255, 0.38);
  color: var(--glass-ink);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.76),
    0 8px 22px rgba(25, 42, 65, 0.08);
  backdrop-filter: blur(18px) saturate(170%);
  -webkit-backdrop-filter: blur(18px) saturate(170%);
}

.task-input:focus,
.search-input:focus,
.task-edit-input:focus {
  border-color: rgba(0, 168, 216, 0.54);
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.84), rgba(255, 255, 255, 0.36)),
    rgba(255, 255, 255, 0.5);
  box-shadow:
    0 0 0 3px rgba(0, 168, 216, 0.14),
    inset 0 1px 0 rgba(255, 255, 255, 0.82),
    0 10px 26px rgba(25, 42, 65, 0.12);
}

.add-btn {
  border: 1px solid rgba(255, 255, 255, 0.58);
  border-radius: 14px;
  background:
    radial-gradient(circle at 24% 8%, rgba(255, 255, 255, 0.7), transparent 30%),
    linear-gradient(135deg, rgba(101, 87, 245, 0.95), rgba(0, 168, 216, 0.78));
  box-shadow:
    0 14px 28px rgba(43, 72, 180, 0.25),
    inset 0 1px 0 rgba(255, 255, 255, 0.7);
}

.tasks-section {
  padding: 12px 12px 10px;
}

.tasks-list {
  gap: 12px;
}

.task-item {
  position: relative;
  overflow: hidden;
  padding: 15px 13px;
  border: 1px solid rgba(255, 255, 255, 0.58);
  border-radius: 14px;
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.56), rgba(255, 255, 255, 0.22)),
    rgba(255, 255, 255, 0.34);
  box-shadow:
    0 16px 38px rgba(25, 42, 65, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.78),
    inset 0 -1px 0 rgba(255, 255, 255, 0.18);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
}

.task-item::before {
  position: absolute;
  inset: 1px;
  content: '';
  pointer-events: none;
  border-radius: 13px;
  background:
    linear-gradient(110deg, rgba(255, 255, 255, 0.55), transparent 34%),
    radial-gradient(circle at 92% 12%, rgba(255, 255, 255, 0.35), transparent 30%);
  opacity: 0.68;
}

.task-item:hover,
.task-item.draggable:hover {
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.72), rgba(255, 255, 255, 0.3)),
    rgba(255, 255, 255, 0.48);
  box-shadow:
    0 20px 44px rgba(25, 42, 65, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.86),
    inset 0 -1px 0 rgba(255, 255, 255, 0.2);
}

.task-item.completed {
  opacity: 0.9;
  background:
    linear-gradient(145deg, rgba(224, 255, 242, 0.58), rgba(255, 255, 255, 0.24)),
    rgba(32, 200, 121, 0.14);
  border-color: rgba(125, 232, 179, 0.48);
}

.task-item.editing {
  background:
    linear-gradient(145deg, rgba(234, 250, 255, 0.68), rgba(255, 255, 255, 0.26)),
    rgba(0, 168, 216, 0.13);
  border-color: rgba(0, 168, 216, 0.5);
}

.task-content,
.task-actions {
  position: relative;
  z-index: 1;
}

.task-checkbox {
  width: 26px;
  height: 26px;
  border: 2px solid rgba(70, 87, 110, 0.22);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.28);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.7),
    0 8px 18px rgba(25, 42, 65, 0.08);
}

.task-checkbox:hover {
  border-color: rgba(0, 168, 216, 0.58);
}

.task-checkbox.checked {
  border-color: rgba(255, 255, 255, 0.58);
  background:
    radial-gradient(circle at 24% 16%, rgba(255, 255, 255, 0.8), transparent 34%),
    linear-gradient(135deg, rgba(32, 200, 121, 0.98), rgba(0, 168, 216, 0.76));
  box-shadow:
    0 10px 20px rgba(32, 200, 121, 0.25),
    inset 0 1px 0 rgba(255, 255, 255, 0.7);
}

.task-text {
  color: var(--glass-ink);
  font-size: 15px;
  line-height: 1.45;
}

.task-item.completed .task-text {
  color: rgba(65, 81, 102, 0.46);
}

.stats-section {
  padding: 14px 16px 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.44);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.52),
    0 -18px 40px rgba(25, 42, 65, 0.08);
}

.stat-card {
  min-width: 64px;
  padding: 9px 13px;
  border: 1px solid rgba(255, 255, 255, 0.58);
  border-radius: 13px;
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.68), rgba(255, 255, 255, 0.24)),
    rgba(255, 255, 255, 0.34);
  box-shadow:
    0 13px 28px rgba(25, 42, 65, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(20px) saturate(175%);
  -webkit-backdrop-filter: blur(20px) saturate(175%);
}

.stat-number {
  color: var(--glass-ink);
  font-size: 18px;
}

.stat-card.completed .stat-number {
  color: var(--glass-success);
}

.stat-card.pending .stat-number {
  color: var(--glass-warning);
}

.stat-label {
  color: var(--glass-muted);
  font-size: 11px;
}

.stat-divider {
  background: linear-gradient(to bottom, transparent, rgba(255, 255, 255, 0.72), transparent);
}

.filter-container {
  gap: 8px;
}

.tasks-section::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, rgba(101, 87, 245, 0.68), rgba(0, 168, 216, 0.68));
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.42);
}

.todo-container.dark-theme {
  --glass-ink: #eef7ff;
  --glass-muted: rgba(215, 228, 242, 0.64);
  --glass-panel: rgba(18, 28, 42, 0.42);
  --glass-panel-strong: rgba(24, 36, 52, 0.62);
  --glass-edge: rgba(255, 255, 255, 0.18);
  --glass-inner-edge: rgba(255, 255, 255, 0.12);
  --glass-shadow: rgba(0, 0, 0, 0.34);
  --glass-accent: #8c82ff;
  --glass-accent-2: #3be4ff;
  --glass-success: #51e2a0;
  --glass-warning: #ffc45a;
  background:
    linear-gradient(145deg, rgba(14, 24, 38, 0.72), rgba(8, 14, 23, 0.5)),
    rgba(7, 13, 22, 0.44);
  border-color: rgba(255, 255, 255, 0.16);
  box-shadow:
    0 28px 72px rgba(0, 0, 0, 0.46),
    0 8px 28px rgba(24, 255, 226, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.16),
    inset 0 -1px 0 rgba(255, 255, 255, 0.06);
}

.todo-container.dark-theme::before {
  background:
    radial-gradient(circle at 16% 8%, rgba(255, 255, 255, 0.16) 0 8%, transparent 26%),
    radial-gradient(circle at 84% 14%, rgba(59, 228, 255, 0.22) 0 12%, transparent 34%),
    radial-gradient(circle at 15% 78%, rgba(140, 130, 255, 0.22) 0 16%, transparent 42%),
    radial-gradient(circle at 78% 86%, rgba(81, 226, 160, 0.16) 0 12%, transparent 36%),
    linear-gradient(150deg, rgba(255, 255, 255, 0.08), transparent 50%, rgba(59, 228, 255, 0.12));
}

.dark-theme .title-bar,
.dark-theme .title-bar.draggable,
.dark-theme .title-bar:not(.draggable),
.dark-theme .quick-actions,
.dark-theme .expandable-section,
.dark-theme .stats-section {
  background: rgba(12, 20, 31, 0.28);
  border-color: rgba(255, 255, 255, 0.13);
}

.dark-theme .title,
.dark-theme .task-text,
.dark-theme .stat-number,
.dark-theme .control-btn {
  color: var(--glass-ink);
}

.dark-theme .control-btn,
.dark-theme .action-btn,
.dark-theme .quick-action-btn,
.dark-theme .filter-btn,
.dark-theme .stat-card,
.dark-theme .task-input,
.dark-theme .search-input,
.dark-theme .task-edit-input {
  border-color: rgba(255, 255, 255, 0.13);
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0.04)),
    rgba(13, 23, 36, 0.42);
  color: var(--glass-ink);
  box-shadow:
    0 14px 30px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.14),
    inset 0 -1px 0 rgba(255, 255, 255, 0.04);
}

.dark-theme .control-btn:hover,
.dark-theme .action-btn:hover,
.dark-theme .quick-action-btn:hover,
.dark-theme .filter-btn:hover,
.dark-theme .stat-card:hover {
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.22), rgba(255, 255, 255, 0.06)),
    rgba(18, 30, 46, 0.52);
}

.dark-theme .quick-action-btn.active,
.dark-theme .filter-btn.active {
  border-color: rgba(255, 255, 255, 0.26);
  background:
    radial-gradient(circle at 24% 12%, rgba(255, 255, 255, 0.36), transparent 34%),
    linear-gradient(135deg, rgba(140, 130, 255, 0.82), rgba(59, 228, 255, 0.52));
}

.dark-theme .task-item,
.dark-theme .task-item:hover,
.dark-theme .task-item.draggable:hover {
  border-color: rgba(255, 255, 255, 0.13);
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0.04)),
    rgba(13, 23, 36, 0.42);
}

.dark-theme .task-item.completed {
  background:
    linear-gradient(145deg, rgba(81, 226, 160, 0.18), rgba(255, 255, 255, 0.05)),
    rgba(13, 40, 34, 0.42);
  border-color: rgba(81, 226, 160, 0.24);
}

.dark-theme .task-item.editing {
  background:
    linear-gradient(145deg, rgba(59, 228, 255, 0.16), rgba(255, 255, 255, 0.05)),
    rgba(13, 32, 44, 0.48);
  border-color: rgba(59, 228, 255, 0.28);
}

.dark-theme .task-item.completed .task-text,
.dark-theme .stat-label {
  color: var(--glass-muted);
}

.dark-theme .task-checkbox {
  border-color: rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.08);
}

.dark-theme .task-checkbox.checked {
  border-color: rgba(255, 255, 255, 0.24);
  background:
    radial-gradient(circle at 24% 16%, rgba(255, 255, 255, 0.52), transparent 34%),
    linear-gradient(135deg, rgba(81, 226, 160, 0.9), rgba(59, 228, 255, 0.58));
}

.dark-theme .tasks-section::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, rgba(140, 130, 255, 0.74), rgba(59, 228, 255, 0.62));
}

/* Apple-style clear glass tuning */
.todo-container {
  --glass-ink: rgba(247, 250, 255, 0.94);
  --glass-muted: rgba(247, 250, 255, 0.58);
  --glass-panel: rgba(255, 255, 255, 0.12);
  --glass-panel-strong: rgba(255, 255, 255, 0.2);
  --glass-edge: rgba(255, 255, 255, 0.27);
  --glass-inner-edge: rgba(255, 255, 255, 0.32);
  --glass-shadow: rgba(0, 0, 0, 0.24);
  --glass-accent: #2f7dff;
  --glass-accent-2: #67d7ff;
  --glass-success: #34d98b;
  --glass-warning: #ffb020;

  color: var(--glass-ink);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.055)),
    rgba(31, 37, 46, 0.18);
  border-color: rgba(255, 255, 255, 0.2);
  border-radius: 22px;
  box-shadow:
    0 28px 72px rgba(0, 0, 0, 0.34),
    inset 0 1px 0 rgba(255, 255, 255, 0.36),
    inset 0 -1px 0 rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(48px) saturate(142%) brightness(0.96);
  -webkit-backdrop-filter: blur(48px) saturate(142%) brightness(0.96);
}

.todo-container::before {
  background:
    linear-gradient(110deg, rgba(255, 255, 255, 0.24), transparent 31%, transparent 68%, rgba(255, 255, 255, 0.1)),
    repeating-linear-gradient(116deg, rgba(255, 255, 255, 0.05) 0 1px, transparent 1px 8px);
  opacity: 0.48;
}

.todo-container::after {
  border: 1px solid rgba(255, 255, 255, 0.14);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.28), transparent 12%, transparent 82%, rgba(255, 255, 255, 0.1)),
    radial-gradient(ellipse at 50% 0%, rgba(255, 255, 255, 0.18), transparent 42%);
  mix-blend-mode: screen;
  opacity: 0.54;
}

.title-bar,
.title-bar:not(.draggable),
.quick-actions,
.expandable-section,
.stats-section,
.dark-theme .title-bar,
.dark-theme .title-bar.draggable,
.dark-theme .title-bar:not(.draggable),
.dark-theme .quick-actions,
.dark-theme .expandable-section,
.dark-theme .stats-section {
  background: rgba(255, 255, 255, 0.07);
  border-color: rgba(255, 255, 255, 0.16);
  backdrop-filter: blur(44px) saturate(140%);
  -webkit-backdrop-filter: blur(44px) saturate(140%);
}

.title-bar {
  padding: 11px 16px 10px;
}

.title,
.dark-theme .title {
  color: var(--glass-ink);
  font-weight: 700;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.34);
}

.quick-action-btn,
.filter-btn,
.control-btn,
.action-btn,
.clear-search-btn,
.stat-card,
.task-input,
.search-input,
.task-edit-input,
.dark-theme .quick-action-btn,
.dark-theme .filter-btn,
.dark-theme .control-btn,
.dark-theme .action-btn,
.dark-theme .stat-card,
.dark-theme .task-input,
.dark-theme .search-input,
.dark-theme .task-edit-input {
  border-color: var(--glass-edge);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.23), rgba(255, 255, 255, 0.075)),
    rgba(255, 255, 255, 0.07);
  color: var(--glass-ink);
  box-shadow:
    0 14px 30px rgba(0, 0, 0, 0.17),
    inset 0 1px 0 rgba(255, 255, 255, 0.38),
    inset 0 -1px 0 rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(34px) saturate(145%);
  -webkit-backdrop-filter: blur(34px) saturate(145%);
}

.quick-action-btn:hover,
.filter-btn:hover,
.control-btn:hover,
.action-btn:hover,
.clear-search-btn:hover,
.stat-card:hover,
.dark-theme .quick-action-btn:hover,
.dark-theme .filter-btn:hover,
.dark-theme .control-btn:hover,
.dark-theme .action-btn:hover,
.dark-theme .stat-card:hover {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0.11)),
    rgba(255, 255, 255, 0.11);
  box-shadow:
    0 18px 38px rgba(0, 0, 0, 0.21),
    inset 0 1px 0 rgba(255, 255, 255, 0.44),
    inset 0 -1px 0 rgba(255, 255, 255, 0.1);
}

.quick-action-btn.active,
.filter-btn.active,
.dark-theme .quick-action-btn.active,
.dark-theme .filter-btn.active {
  border-color: rgba(255, 255, 255, 0.36);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.34), rgba(255, 255, 255, 0.08)),
    linear-gradient(135deg, rgba(47, 125, 255, 0.68), rgba(80, 180, 255, 0.36));
  color: #fff;
  box-shadow:
    0 18px 42px rgba(32, 104, 255, 0.32),
    inset 0 1px 0 rgba(255, 255, 255, 0.48),
    inset 0 -1px 0 rgba(255, 255, 255, 0.1);
}

.tasks-section {
  padding: 14px 16px 10px;
}

.tasks-list {
  gap: 18px;
}

.task-item,
.task-item:hover,
.task-item.draggable:hover,
.dark-theme .task-item,
.dark-theme .task-item:hover,
.dark-theme .task-item.draggable:hover {
  border-color: rgba(255, 255, 255, 0.25);
  border-radius: 22px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.22), rgba(255, 255, 255, 0.075)),
    rgba(255, 255, 255, 0.08);
  box-shadow:
    0 20px 42px rgba(0, 0, 0, 0.22),
    inset 0 1px 0 rgba(255, 255, 255, 0.36),
    inset 0 -1px 0 rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(42px) saturate(142%);
  -webkit-backdrop-filter: blur(42px) saturate(142%);
}

.task-item::before {
  inset: 1px;
  border-radius: 21px;
  background:
    linear-gradient(105deg, rgba(255, 255, 255, 0.26), transparent 38%),
    radial-gradient(ellipse at 50% 100%, rgba(255, 255, 255, 0.16), transparent 56%);
  opacity: 0.7;
}

.task-item::after {
  position: absolute;
  right: 18px;
  bottom: 8px;
  left: 18px;
  height: 1px;
  content: '';
  pointer-events: none;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
  opacity: 0.62;
}

.task-item.completed,
.dark-theme .task-item.completed {
  opacity: 0.92;
  background:
    linear-gradient(180deg, rgba(110, 255, 190, 0.18), rgba(255, 255, 255, 0.055)),
    rgba(255, 255, 255, 0.075);
  border-color: rgba(129, 255, 202, 0.34);
}

.task-item.editing,
.dark-theme .task-item.editing {
  background:
    linear-gradient(180deg, rgba(120, 210, 255, 0.2), rgba(255, 255, 255, 0.06)),
    rgba(255, 255, 255, 0.08);
  border-color: rgba(145, 225, 255, 0.38);
}

.task-text,
.dark-theme .task-text,
.stat-number,
.dark-theme .stat-number,
.filter-btn,
.quick-action-btn,
.control-btn {
  color: var(--glass-ink);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.28);
}

.task-item.completed .task-text,
.dark-theme .task-item.completed .task-text,
.stat-label,
.dark-theme .stat-label {
  color: var(--glass-muted);
}

.task-checkbox,
.dark-theme .task-checkbox {
  border-color: rgba(255, 255, 255, 0.38);
  background: rgba(255, 255, 255, 0.08);
}

.task-checkbox.checked,
.dark-theme .task-checkbox.checked {
  border-color: rgba(255, 255, 255, 0.38);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.34), rgba(255, 255, 255, 0.05)),
    rgba(52, 217, 139, 0.58);
}

.task-input::placeholder,
.search-input::placeholder,
.dark-theme .task-input::placeholder,
.dark-theme .search-input::placeholder {
  color: rgba(247, 250, 255, 0.48);
}

.task-input:focus,
.search-input:focus,
.task-edit-input:focus,
.dark-theme .task-input:focus,
.dark-theme .search-input:focus {
  border-color: rgba(255, 255, 255, 0.42);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.28), rgba(255, 255, 255, 0.1)),
    rgba(255, 255, 255, 0.1);
  box-shadow:
    0 0 0 3px rgba(120, 205, 255, 0.12),
    0 14px 30px rgba(0, 0, 0, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.42);
}

.add-btn {
  border-color: rgba(255, 255, 255, 0.36);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.36), rgba(255, 255, 255, 0.08)),
    rgba(47, 125, 255, 0.58);
  box-shadow:
    0 18px 36px rgba(32, 104, 255, 0.28),
    inset 0 1px 0 rgba(255, 255, 255, 0.48);
}

.stats-section {
  background:
    linear-gradient(90deg, rgba(126, 116, 255, 0.12), rgba(255, 255, 255, 0.065) 45%, rgba(82, 255, 198, 0.1)),
    rgba(255, 255, 255, 0.05);
}

.stat-card {
  border-radius: 18px;
}

.stat-card.completed .stat-number,
.dark-theme .stat-card.completed .stat-number {
  color: #50f0a6;
}

.stat-card.pending .stat-number,
.dark-theme .stat-card.pending .stat-number {
  color: #ffd057;
}

.todo-container.dark-theme {
  --glass-ink: rgba(247, 250, 255, 0.94);
  --glass-muted: rgba(247, 250, 255, 0.6);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.13), rgba(255, 255, 255, 0.04)),
    rgba(12, 15, 20, 0.22);
  border-color: rgba(255, 255, 255, 0.17);
}

.todo-container.dark-theme::before {
  background:
    linear-gradient(110deg, rgba(255, 255, 255, 0.16), transparent 31%, transparent 68%, rgba(255, 255, 255, 0.08)),
    repeating-linear-gradient(116deg, rgba(255, 255, 255, 0.045) 0 1px, transparent 1px 8px);
}

/* Higher transparency pass */
.todo-container,
.todo-container.dark-theme {
  --glass-edge: rgba(255, 255, 255, 0.2);
  --glass-inner-edge: rgba(255, 255, 255, 0.22);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.11), rgba(255, 255, 255, 0.018)),
    rgba(14, 18, 24, 0.06);
  border-color: rgba(255, 255, 255, 0.15);
  box-shadow:
    0 28px 72px rgba(0, 0, 0, 0.28),
    inset 0 1px 0 rgba(255, 255, 255, 0.28),
    inset 0 -1px 0 rgba(255, 255, 255, 0.055);
  backdrop-filter: blur(64px) saturate(122%) brightness(0.9);
  -webkit-backdrop-filter: blur(64px) saturate(122%) brightness(0.9);
}

.todo-container::before,
.todo-container.dark-theme::before {
  background:
    linear-gradient(110deg, rgba(255, 255, 255, 0.13), transparent 31%, transparent 70%, rgba(255, 255, 255, 0.045)),
    repeating-linear-gradient(116deg, rgba(255, 255, 255, 0.028) 0 1px, transparent 1px 8px);
  opacity: 0.26;
}

.todo-container::after {
  border-color: rgba(255, 255, 255, 0.09);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.14), transparent 13%, transparent 84%, rgba(255, 255, 255, 0.055)),
    radial-gradient(ellipse at 50% 0%, rgba(255, 255, 255, 0.09), transparent 44%);
  opacity: 0.34;
}

.title-bar,
.title-bar:not(.draggable),
.quick-actions,
.expandable-section,
.stats-section,
.dark-theme .title-bar,
.dark-theme .title-bar.draggable,
.dark-theme .title-bar:not(.draggable),
.dark-theme .quick-actions,
.dark-theme .expandable-section,
.dark-theme .stats-section {
  background: rgba(255, 255, 255, 0.032);
  border-color: rgba(255, 255, 255, 0.105);
}

.quick-action-btn,
.filter-btn,
.control-btn,
.action-btn,
.clear-search-btn,
.stat-card,
.task-input,
.search-input,
.task-edit-input,
.dark-theme .quick-action-btn,
.dark-theme .filter-btn,
.dark-theme .control-btn,
.dark-theme .action-btn,
.dark-theme .stat-card,
.dark-theme .task-input,
.dark-theme .search-input,
.dark-theme .task-edit-input {
  border-color: rgba(255, 255, 255, 0.18);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.13), rgba(255, 255, 255, 0.032)),
    rgba(255, 255, 255, 0.028);
  box-shadow:
    0 14px 30px rgba(0, 0, 0, 0.14),
    inset 0 1px 0 rgba(255, 255, 255, 0.25),
    inset 0 -1px 0 rgba(255, 255, 255, 0.045);
}

.quick-action-btn:hover,
.filter-btn:hover,
.control-btn:hover,
.action-btn:hover,
.clear-search-btn:hover,
.stat-card:hover,
.dark-theme .quick-action-btn:hover,
.dark-theme .filter-btn:hover,
.dark-theme .control-btn:hover,
.dark-theme .action-btn:hover,
.dark-theme .stat-card:hover {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0.045)),
    rgba(255, 255, 255, 0.04);
}

.task-item,
.task-item:hover,
.task-item.draggable:hover,
.dark-theme .task-item,
.dark-theme .task-item:hover,
.dark-theme .task-item.draggable:hover {
  border-color: rgba(255, 255, 255, 0.19);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.03)),
    rgba(255, 255, 255, 0.03);
  box-shadow:
    0 20px 42px rgba(0, 0, 0, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.24),
    inset 0 -1px 0 rgba(255, 255, 255, 0.045);
}

.task-item::before {
  background:
    linear-gradient(105deg, rgba(255, 255, 255, 0.15), transparent 38%),
    radial-gradient(ellipse at 50% 100%, rgba(255, 255, 255, 0.08), transparent 56%);
  opacity: 0.46;
}

.task-item::after {
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.26), transparent);
  opacity: 0.42;
}

.task-item.completed,
.dark-theme .task-item.completed {
  background:
    linear-gradient(180deg, rgba(110, 255, 190, 0.11), rgba(255, 255, 255, 0.026)),
    rgba(255, 255, 255, 0.028);
  border-color: rgba(129, 255, 202, 0.24);
}

.task-item.editing,
.dark-theme .task-item.editing {
  background:
    linear-gradient(180deg, rgba(120, 210, 255, 0.12), rgba(255, 255, 255, 0.028)),
    rgba(255, 255, 255, 0.032);
  border-color: rgba(145, 225, 255, 0.28);
}

.stats-section {
  background:
    linear-gradient(90deg, rgba(126, 116, 255, 0.07), rgba(255, 255, 255, 0.028) 45%, rgba(82, 255, 198, 0.06)),
    rgba(255, 255, 255, 0.022);
}

/* Subtask checklist */
.task-item {
  align-items: stretch;
  flex-direction: column;
  gap: 10px;
  justify-content: flex-start;
}

.task-main-row {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 10px;
}

.task-content {
  min-width: 0;
}

.task-text-block {
  min-width: 0;
  flex: 1;
}

.subtask-summary {
  margin-top: 3px;
  color: rgba(247, 250, 255, 0.48);
  font-size: 11px;
  font-weight: 600;
  line-height: 1.2;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.28);
}

.subtask-toggle-btn.active {
  border-color: rgba(255, 255, 255, 0.32);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.22), rgba(255, 255, 255, 0.052)),
    rgba(47, 125, 255, 0.24);
  color: #fff;
}

.subtasks-panel {
  position: relative;
  z-index: 1;
  display: flex;
  width: 100%;
  flex-direction: column;
  gap: 8px;
  padding: 0 2px 0 38px;
}

.subtasks-progress {
  display: flex;
  align-items: center;
  gap: 8px;
  color: rgba(247, 250, 255, 0.54);
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.26);
}

.subtasks-progress-track {
  position: relative;
  height: 3px;
  flex: 1;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.09);
}

.subtasks-progress-fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, rgba(80, 240, 166, 0.82), rgba(103, 215, 255, 0.72));
  transition: width 0.2s ease;
}

.subtask-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.subtask-item {
  display: flex;
  min-height: 30px;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border: 1px solid rgba(255, 255, 255, 0.13);
  border-radius: 12px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.075), rgba(255, 255, 255, 0.02)),
    rgba(255, 255, 255, 0.02);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.16),
    0 10px 22px rgba(0, 0, 0, 0.08);
  backdrop-filter: blur(24px) saturate(120%);
  -webkit-backdrop-filter: blur(24px) saturate(120%);
}

.subtask-item.completed {
  border-color: rgba(129, 255, 202, 0.18);
  background:
    linear-gradient(180deg, rgba(110, 255, 190, 0.07), rgba(255, 255, 255, 0.016)),
    rgba(255, 255, 255, 0.018);
}

.subtask-check {
  width: 18px;
  height: 18px;
  flex: 0 0 auto;
  border: 1px solid rgba(255, 255, 255, 0.28);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.04);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  transition: all 0.2s ease;
}

.subtask-check.checked {
  border-color: rgba(255, 255, 255, 0.34);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.24), rgba(255, 255, 255, 0.04)),
    rgba(52, 217, 139, 0.58);
}

.subtask-text {
  min-width: 0;
  flex: 1;
  color: rgba(247, 250, 255, 0.86);
  font-size: 13px;
  line-height: 1.35;
  overflow-wrap: anywhere;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.26);
}

.subtask-item.completed .subtask-text {
  color: rgba(247, 250, 255, 0.42);
  text-decoration: line-through;
}

.subtask-delete-btn {
  width: 22px;
  height: 22px;
  flex: 0 0 auto;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.03);
  color: rgba(247, 250, 255, 0.56);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  transition: all 0.2s ease;
}

.subtask-delete-btn:hover {
  background: rgba(255, 90, 90, 0.18);
  color: #fff;
}

.subtask-input-row {
  display: flex;
  gap: 7px;
}

.subtask-input {
  min-width: 0;
  flex: 1;
  padding: 8px 10px;
  border: 1px solid rgba(255, 255, 255, 0.17);
  border-radius: 12px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.11), rgba(255, 255, 255, 0.028)),
    rgba(255, 255, 255, 0.026);
  color: rgba(247, 250, 255, 0.92);
  font-size: 13px;
  outline: none;
  backdrop-filter: blur(24px) saturate(120%);
  -webkit-backdrop-filter: blur(24px) saturate(120%);
}

.subtask-input::placeholder {
  color: rgba(247, 250, 255, 0.42);
}

.subtask-input:focus {
  border-color: rgba(255, 255, 255, 0.28);
  box-shadow:
    0 0 0 3px rgba(120, 205, 255, 0.09),
    inset 0 1px 0 rgba(255, 255, 255, 0.22);
}

.subtask-add-btn {
  min-width: 48px;
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 12px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0.038)),
    rgba(47, 125, 255, 0.28);
  color: rgba(247, 250, 255, 0.94);
  cursor: pointer;
  font-size: 12px;
  font-weight: 700;
  transition: all 0.2s ease;
}

.subtask-add-btn:hover:not(:disabled) {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.24), rgba(255, 255, 255, 0.055)),
    rgba(47, 125, 255, 0.38);
}

.subtask-add-btn:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

@media (max-height: 600px) {
  .subtasks-panel {
    padding-left: 34px;
  }

  .subtask-item {
    min-height: 28px;
    padding: 5px 7px;
  }
}

/* Top edge cleanup */
.todo-container,
.todo-container.dark-theme {
  box-shadow:
    0 30px 70px -26px rgba(0, 0, 0, 0.3),
    0 10px 28px -18px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.22),
    inset 0 -1px 0 rgba(255, 255, 255, 0.055);
}

.title-bar,
.title-bar:not(.draggable),
.dark-theme .title-bar,
.dark-theme .title-bar.draggable,
.dark-theme .title-bar:not(.draggable) {
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.18);
}

.title,
.dark-theme .title,
.task-text,
.dark-theme .task-text,
.stat-number,
.dark-theme .stat-number,
.filter-btn,
.quick-action-btn,
.control-btn {
  text-shadow: none;
}

/* Window corner clipping */
.todo-container,
.todo-container.dark-theme {
  --window-radius: 28px;
  border-radius: var(--window-radius);
  background-clip: padding-box;
  clip-path: inset(0 round var(--window-radius));
  contain: paint;
  overflow: hidden;
  overflow: clip;
}

.todo-container::before,
.todo-container::after,
.todo-container.dark-theme::before,
.todo-container.dark-theme::after {
  border-radius: inherit;
  clip-path: inset(0 round var(--window-radius));
}

.title-bar,
.title-bar:not(.draggable),
.dark-theme .title-bar,
.dark-theme .title-bar.draggable,
.dark-theme .title-bar:not(.draggable) {
  border-radius: var(--window-radius) var(--window-radius) 0 0;
}

.stats-section {
  border-radius: 0 0 var(--window-radius) var(--window-radius);
}

/* Fully transparent shell */
.todo-container,
.todo-container.dark-theme {
  background: transparent !important;
  border-color: transparent !important;
  box-shadow: none !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}

.todo-container::before,
.todo-container::after,
.todo-container.dark-theme::before,
.todo-container.dark-theme::after {
  display: none;
}

.title-bar,
.title-bar:not(.draggable),
.quick-actions,
.expandable-section,
.stats-section,
.dark-theme .title-bar,
.dark-theme .title-bar.draggable,
.dark-theme .title-bar:not(.draggable),
.dark-theme .quick-actions,
.dark-theme .expandable-section,
.dark-theme .stats-section {
  background: transparent !important;
  border-color: transparent !important;
  box-shadow: none !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}

.tasks-section {
  background: transparent !important;
}

/* Fully transparent interface surfaces */
.todo-container *,
.todo-container.dark-theme * {
  box-shadow: none !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}

.todo-container button,
.todo-container input,
.todo-container .task-item,
.todo-container .task-main-row,
.todo-container .task-actions,
.todo-container .quick-action-btn,
.todo-container .filter-btn,
.todo-container .control-btn,
.todo-container .action-btn,
.todo-container .clear-search-btn,
.todo-container .task-checkbox,
.todo-container .subtask-check,
.todo-container .stat-card,
.todo-container .stat-divider,
.todo-container .subtasks-panel,
.todo-container .subtasks-progress-track,
.todo-container .subtasks-progress-fill,
.todo-container .subtask-item,
.todo-container .subtask-delete-btn,
.todo-container .subtask-add-btn,
.todo-container .task-input,
.todo-container .search-input,
.todo-container .task-edit-input,
.todo-container .subtask-input,
.todo-container .add-btn {
  background: transparent !important;
  background-image: none !important;
  border-color: transparent !important;
  outline-color: transparent !important;
}

.todo-container button:hover,
.todo-container button:focus,
.todo-container button:active,
.todo-container input:hover,
.todo-container input:focus,
.todo-container .task-item:hover,
.todo-container .task-item.draggable:hover,
.todo-container .subtask-item:hover,
.todo-container .quick-action-btn.active,
.todo-container .filter-btn.active,
.todo-container .subtask-toggle-btn.active,
.todo-container .task-checkbox.checked,
.todo-container .subtask-check.checked {
  background: transparent !important;
  background-image: none !important;
  border-color: transparent !important;
  outline-color: transparent !important;
}

.task-item::before,
.task-item::after,
.subtask-item::before,
.subtask-item::after,
.stat-card::before,
.stat-card::after {
  display: none !important;
}

.tasks-section::-webkit-scrollbar-track,
.tasks-section::-webkit-scrollbar-thumb,
.tasks-section::-webkit-scrollbar-thumb:hover {
  background: transparent !important;
  box-shadow: none !important;
}

/* Liquid glass outline only */
.todo-container .task-item,
.todo-container .stat-card,
.todo-container .quick-action-btn,
.todo-container .filter-btn,
.todo-container .control-btn,
.todo-container .action-btn,
.todo-container .clear-search-btn,
.todo-container .task-input,
.todo-container .search-input,
.todo-container .task-edit-input,
.todo-container .subtask-input,
.todo-container .subtask-item,
.todo-container .subtask-add-btn,
.todo-container .subtask-delete-btn,
.todo-container .add-btn {
  border-color: rgba(255, 255, 255, 0.22) !important;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.055), rgba(255, 255, 255, 0.012)) !important;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.34) !important,
    inset 0 -1px 0 rgba(255, 255, 255, 0.075) !important,
    0 10px 26px rgba(0, 0, 0, 0.12) !important;
  backdrop-filter: blur(18px) saturate(118%) !important;
  -webkit-backdrop-filter: blur(18px) saturate(118%) !important;
}

.todo-container .task-item {
  border-color: rgba(255, 255, 255, 0.27) !important;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.07), rgba(255, 255, 255, 0.016)) !important;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.4) !important,
    inset 0 -1px 0 rgba(255, 255, 255, 0.09) !important,
    0 18px 42px rgba(0, 0, 0, 0.16) !important;
}

.todo-container .task-item.completed {
  border-color: rgba(129, 255, 202, 0.34) !important;
  background:
    linear-gradient(180deg, rgba(129, 255, 202, 0.08), rgba(255, 255, 255, 0.012)) !important;
}

.todo-container .task-item.editing {
  border-color: rgba(145, 225, 255, 0.38) !important;
}

.todo-container .task-item::after {
  right: 18px;
  bottom: 7px;
  left: 18px;
  display: block !important;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.28), transparent) !important;
  opacity: 0.56;
}

.todo-container .subtasks-progress-track {
  border: 1px solid rgba(255, 255, 255, 0.14) !important;
  background: rgba(255, 255, 255, 0.03) !important;
}

.todo-container .subtasks-progress-fill {
  background: linear-gradient(90deg, rgba(80, 240, 166, 0.86), rgba(103, 215, 255, 0.7)) !important;
}

.todo-container .task-checkbox,
.todo-container .subtask-check {
  border-color: rgba(255, 255, 255, 0.36) !important;
  background: rgba(255, 255, 255, 0.035) !important;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.24) !important,
    inset 0 -1px 0 rgba(255, 255, 255, 0.06) !important;
}

.todo-container .task-checkbox.checked,
.todo-container .subtask-check.checked {
  border-color: rgba(255, 255, 255, 0.44) !important;
  background: rgba(52, 217, 139, 0.48) !important;
}

.todo-container .quick-action-btn.active,
.todo-container .filter-btn.active,
.todo-container .subtask-toggle-btn.active {
  border-color: rgba(255, 255, 255, 0.34) !important;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.1), rgba(47, 125, 255, 0.16)) !important;
}

.todo-container button:hover,
.todo-container .task-item:hover,
.todo-container .subtask-item:hover {
  border-color: rgba(255, 255, 255, 0.36) !important;
}

/* Kill any top strip residue */
.todo-container .title-bar,
.todo-container .title-bar.draggable,
.todo-container .title-bar:not(.draggable),
.todo-container .title-bar *,
.todo-container .title-bar::before,
.todo-container .title-bar::after,
.todo-container .window-controls,
.todo-container .window-controls::before,
.todo-container .window-controls::after {
  background-color: transparent !important;
  background-image: none !important;
  border-color: transparent !important;
  box-shadow: none !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}

.todo-container .title-bar {
  isolation: auto;
  overflow: visible;
}
</style>
