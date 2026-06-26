import { ElectronAPI } from '@electron-toolkit/preload'

// 定义便签 API 接口
interface StickyNoteAPI {
  toggleAlwaysOnTop: () => Promise<boolean>
  setOpacity: (opacity: number) => Promise<boolean>
  minimizeWindow: () => Promise<boolean>
  closeWindow: () => Promise<boolean>
  showContextMenu: (x: number, y: number, isDarkTheme?: boolean) => Promise<void>
  toggleWindowMovable: () => Promise<boolean>
  setWindowMovable: (movable: boolean) => Promise<boolean>
  toggleDesktopMode: () => Promise<boolean>
  setDesktopMode: (enabled: boolean) => Promise<boolean>
  saveData: (data: any) => Promise<boolean>
  loadData: () => Promise<any>
  onAlwaysOnTopChanged: (callback: (isOnTop: boolean) => void) => void
  onOpacityChanged: (callback: (opacity: number) => void) => void
  onWindowMovableChanged: (callback: (isMovable: boolean) => void) => void
  onDesktopModeChanged: (callback: (enabled: boolean) => void) => void
  onToggleTheme: (callback: () => void) => void
  removeAllListeners: (channel: string) => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: StickyNoteAPI
  }
}
