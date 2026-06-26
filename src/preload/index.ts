import { contextBridge, ipcRenderer } from 'electron' // 导入 Electron 的 contextBridge 和 ipcRenderer 模块
import { electronAPI } from '@electron-toolkit/preload' // 导入 electron-toolkit 提供的预加载 API

// 定义自定义 API 对象，用于在渲染进程中暴露自定义功能
const api = {
  // 便签窗口控制 API
  toggleAlwaysOnTop: () => ipcRenderer.invoke('toggle-always-on-top'),
  setOpacity: (opacity: number) => ipcRenderer.invoke('set-opacity', opacity),
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  showContextMenu: (x: number, y: number, isDarkTheme?: boolean) => ipcRenderer.invoke('show-context-menu', x, y, isDarkTheme),
  toggleWindowMovable: () => ipcRenderer.invoke('toggle-window-movable'),
  setWindowMovable: (movable: boolean) => ipcRenderer.invoke('set-window-movable', movable),
  toggleDesktopMode: () => ipcRenderer.invoke('toggle-desktop-mode'),
  setDesktopMode: (enabled: boolean) => ipcRenderer.invoke('set-desktop-mode', enabled),

  // 数据持久化 API
  saveData: (data: any) => ipcRenderer.invoke('save-data', data),
  loadData: () => ipcRenderer.invoke('load-data'),

  // 事件监听 API
  onAlwaysOnTopChanged: (callback: (isOnTop: boolean) => void) => {
    ipcRenderer.on('always-on-top-changed', (_, isOnTop) => callback(isOnTop))
  },
  onOpacityChanged: (callback: (opacity: number) => void) => {
    ipcRenderer.on('opacity-changed', (_, opacity) => callback(opacity))
  },
  onWindowMovableChanged: (callback: (isMovable: boolean) => void) => {
    ipcRenderer.on('window-movable-changed', (_, isMovable) => callback(isMovable))
  },
  onDesktopModeChanged: (callback: (enabled: boolean) => void) => {
    ipcRenderer.on('desktop-mode-changed', (_, enabled) => callback(enabled))
  },
  onToggleTheme: (callback: () => void) => {
    ipcRenderer.on('toggle-theme', () => callback())
  },
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel)
  }
}

// 使用 `contextBridge` 模块来安全地将 Electron API 和自定义 API 暴露给渲染进程
// 只有在启用了上下文隔离（context isolation）的情况下才使用 contextBridge
if (process.contextIsolated) {
  try {
    // 将 electronAPI 暴露给渲染进程的全局对象 `window`，命名为 `electron`
    contextBridge.exposeInMainWorld('electron', electronAPI)
    // 将自定义的 api 对象暴露给渲染进程的全局对象 `window`，命名为 `api`
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    // 如果在暴露过程中发生错误，打印错误信息
    console.error(error)
  }
} else {
  // 如果没有启用上下文隔离，则直接将 electronAPI 和 api 添加到全局对象 `window` 中
  // @ts-ignore (忽略 TypeScript 类型检查，因为 window 上没有定义 electron 和 api)
  window.electron = electronAPI
  // @ts-ignore (忽略 TypeScript 类型检查)
  window.api = api
}
