import { app, shell, BrowserWindow, ipcMain, Menu, globalShortcut } from 'electron' // 导入 Electron 的核心模块
import type { BrowserWindowConstructorOptions } from 'electron'
import { join } from 'path' // 导入 Node.js 的 path 模块，用于路径拼接
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs' // 导入文件系统模块
import { electronApp, optimizer, is } from '@electron-toolkit/utils' // 导入 electron-toolkit 的工具模块
import icon from '../../resources/icon.png?asset' // 导入应用的图标文件

// 创建窗口函数
/**
 * 创建主窗口
 *
 * 此函数负责创建应用程序的主浏览器窗口，包括设置窗口属性、
 * 事件监听器以及加载相应的内容（开发环境下加载远程URL，
 * 生产环境下加载本地HTML文件）。
 *
 * @returns {void} 无返回值
 */
function createWindow(): BrowserWindow {
  const isMac = process.platform === 'darwin'
  const isWindows = process.platform === 'win32'
  const platformWindowOptions: BrowserWindowConstructorOptions = {
    ...(isWindows
      ? {
          backgroundMaterial: 'none',
          roundedCorners: true,
          thickFrame: false,
          titleBarOverlay: false
        }
      : {}),
    ...(isMac
      ? {
          vibrancy: 'under-window',
          visualEffectState: 'active'
        }
      : {})
  }

  // 创建浏览器窗口实例 - 便签样式配置
  const mainWindow = new BrowserWindow({
    width: 350, // 便签宽度
    height: 500, // 便签高度
    minWidth: 300, // 最小宽度
    minHeight: 400, // 最小高度
    maxWidth: 500, // 最大宽度
    maxHeight: 800, // 最大高度
    show: false, // 窗口创建时不立即显示
    frame: false, // 无边框窗口
    transparent: true, // 透明背景
    backgroundColor: '#00000000',
    hasShadow: false,
    title: '',
    ...platformWindowOptions,
    alwaysOnTop: false, // 默认不置顶，避免遮挡其他窗口
    resizable: true, // 可调整大小
    movable: true, // 可移动
    skipTaskbar: false, // 在任务栏显示
    autoHideMenuBar: true, // 自动隐藏菜单栏
    ...(process.platform !== 'darwin' ? { icon } : {}), // macOS 应用图标由打包配置处理
    webPreferences: {
      // 配置 Web 内容的偏好设置
      preload: join(__dirname, '../preload/index.js'), // 设置预加载脚本路径
      sandbox: false, // 禁用沙箱模式
      nodeIntegration: false, // 禁用 Node.js 集成
      contextIsolation: true, // 启用上下文隔离
      webSecurity: false // 禁用 web 安全策略（用于透明窗口）
    }
  })

  let isNudgingBounds = false

  const clearTransparentArtifacts = (nudgeBounds = false): void => {
    mainWindow.setTitle('')
    mainWindow.setBackgroundColor('#00000000')
    mainWindow.setMenu(null)
    mainWindow.setMenuBarVisibility(false)
    mainWindow.setHasShadow(false)
    mainWindow.webContents.invalidate()

    if (isWindows && nudgeBounds && !isNudgingBounds) {
      isNudgingBounds = true
      const bounds = mainWindow.getBounds()
      const widthDelta = bounds.width > 300 ? -1 : 1
      mainWindow.setBounds({ ...bounds, width: bounds.width + widthDelta }, false)
      setTimeout(() => {
        mainWindow.setBounds(bounds, false)
        mainWindow.webContents.invalidate()
        isNudgingBounds = false
      }, 16)
    }
  }

  mainWindow.on('ready-to-show', () => {
    // 监听窗口准备显示的事件
    clearTransparentArtifacts()
    mainWindow.show() // 显示窗口
  })

  mainWindow.on('show', clearTransparentArtifacts)
  mainWindow.on('resize', clearTransparentArtifacts)

  mainWindow.webContents.setWindowOpenHandler((details) => {
    // 设置窗口打开新窗口的处理器
    shell.openExternal(details.url) // 使用系统默认浏览器打开新窗口的 URL
    return { action: 'deny' } // 阻止新窗口的创建
  })

  // 窗口失去焦点时的处理（可选：降低透明度）
  mainWindow.on('blur', () => {
    clearTransparentArtifacts(true)
    setTimeout(() => clearTransparentArtifacts(true), 50)
  })

  // 窗口获得焦点时的处理
  mainWindow.on('focus', () => {
    clearTransparentArtifacts(true)
    setTimeout(() => clearTransparentArtifacts(true), 50)
  })

  // HMR for renderer base on electron-vite cli.
  // 根据开发环境或生产环境加载不同的内容
  // 如果是开发环境且设置了环境变量 ELECTRON_RENDERER_URL，则加载远程 URL
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    // 否则加载本地 HTML 文件
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return mainWindow
}

// 当 Electron 初始化完成并准备好创建浏览器窗口时触发
app.whenReady().then(() => {
  // 设置 Windows 系统下的应用模型 ID
  electronApp.setAppUserModelId('com.electron')

  // 监听浏览器窗口创建事件
  app.on('browser-window-created', (_, window) => {
    // 使用 electron-toolkit 的优化工具监控窗口快捷键
    optimizer.watchWindowShortcuts(window)
  })

  // 监听 IPC 通道 'ping' 的事件
  ipcMain.on('ping', () => console.log('pong'))

  // 便签功能相关的 IPC 处理
  let mainWindowRef: BrowserWindow | null = null
  let isDesktopMode = false

  // 调用 createWindow 函数创建主窗口
  const window = createWindow()
  mainWindowRef = window

  const setDesktopMode = (enabled: boolean): boolean => {
    if (!mainWindowRef) {
      return false
    }

    isDesktopMode = enabled
    mainWindowRef.setAlwaysOnTop(false)
    mainWindowRef.setIgnoreMouseEvents(enabled, { forward: true })
    mainWindowRef.setTitle('')
    mainWindowRef.setBackgroundColor('#00000000')
    mainWindowRef.setHasShadow(false)
    mainWindowRef.webContents.invalidate()
    mainWindowRef.webContents.send('always-on-top-changed', false)
    mainWindowRef.webContents.send('desktop-mode-changed', enabled)

    return enabled
  }

  const desktopModeShortcutRegistered = globalShortcut.register('CommandOrControl+Alt+D', () => {
    setDesktopMode(!isDesktopMode)
  })

  if (!desktopModeShortcutRegistered) {
    console.warn('底层穿透模式快捷键注册失败: CommandOrControl+Alt+D')
  }

  // 切换窗口置顶状态
  ipcMain.handle('toggle-always-on-top', () => {
    if (mainWindowRef) {
      if (isDesktopMode) {
        setDesktopMode(false)
      }
      const isOnTop = mainWindowRef.isAlwaysOnTop()
      mainWindowRef.setAlwaysOnTop(!isOnTop)
      return !isOnTop
    }
    return false
  })

  // 切换桌面底层 / 鼠标穿透模式
  ipcMain.handle('toggle-desktop-mode', () => {
    return setDesktopMode(!isDesktopMode)
  })

  ipcMain.handle('set-desktop-mode', (_, enabled: boolean) => {
    return setDesktopMode(Boolean(enabled))
  })

  // 设置窗口透明度
  ipcMain.handle('set-opacity', (_, opacity: number) => {
    if (mainWindowRef) {
      mainWindowRef.setOpacity(Math.max(0.3, Math.min(1, opacity)))
      return true
    }
    return false
  })

  // 最小化窗口
  ipcMain.handle('minimize-window', () => {
    if (mainWindowRef) {
      mainWindowRef.minimize()
      return true
    }
    return false
  })

  // 关闭窗口
  ipcMain.handle('close-window', () => {
    if (mainWindowRef) {
      mainWindowRef.close()
      return true
    }
    return false
  })

  // 切换窗口拖动状态
  ipcMain.handle('toggle-window-movable', () => {
    if (mainWindowRef) {
      const isMovable = mainWindowRef.isMovable()
      mainWindowRef.setMovable(!isMovable)
      return !isMovable
    }
    return false
  })

  // 设置窗口拖动状态
  ipcMain.handle('set-window-movable', (_, movable: boolean) => {
    if (mainWindowRef) {
      mainWindowRef.setMovable(movable)
      return true
    }
    return false
  })

  // 显示右键菜单
  ipcMain.handle('show-context-menu', (_, x, y, isDarkTheme) => {
    if (mainWindowRef) {
      const template = [
        {
          label: '置顶',
          type: 'checkbox' as const,
          checked: mainWindowRef.isAlwaysOnTop(),
          click: () => {
            const isOnTop = mainWindowRef!.isAlwaysOnTop()
            mainWindowRef!.setAlwaysOnTop(!isOnTop)
            mainWindowRef!.webContents.send('always-on-top-changed', !isOnTop)
          }
        },
        {
          label: '底层穿透模式',
          type: 'checkbox' as const,
          checked: isDesktopMode,
          click: () => {
            setDesktopMode(!isDesktopMode)
          }
        },
        {
          label: '允许拖动',
          type: 'checkbox' as const,
          checked: mainWindowRef.isMovable(),
          click: () => {
            const isMovable = mainWindowRef!.isMovable()
            mainWindowRef!.setMovable(!isMovable)
            mainWindowRef!.webContents.send('window-movable-changed', !isMovable)
          }
        },
        {
          label: '深色主题',
          type: 'checkbox' as const,
          checked: isDarkTheme,
          click: () => {
            mainWindowRef!.webContents.send('toggle-theme')
          }
        },
        { type: 'separator' as const },
        {
          label: '透明度',
          submenu: [
            {
              label: '100%',
              click: () => {
                mainWindowRef!.setOpacity(1)
                mainWindowRef!.webContents.send('opacity-changed', 1)
              }
            },
            {
              label: '90%',
              click: () => {
                mainWindowRef!.setOpacity(0.9)
                mainWindowRef!.webContents.send('opacity-changed', 0.9)
              }
            },
            {
              label: '80%',
              click: () => {
                mainWindowRef!.setOpacity(0.8)
                mainWindowRef!.webContents.send('opacity-changed', 0.8)
              }
            },
            {
              label: '70%',
              click: () => {
                mainWindowRef!.setOpacity(0.7)
                mainWindowRef!.webContents.send('opacity-changed', 0.7)
              }
            }
          ]
        },
        { type: 'separator' as const },
        {
          label: '最小化',
          click: () => {
            mainWindowRef!.minimize()
          }
        },
        {
          label: '关闭',
          click: () => {
            mainWindowRef!.close()
          }
        }
      ]

      const menu = Menu.buildFromTemplate(template)
      menu.popup({
        window: mainWindowRef,
        x: Math.round(x),
        y: Math.round(y)
      })
    }
  })

  // 监听 macOS 系统下应用激活事件
  app.on('activate', function () {
    // 如果没有打开的窗口，则重新创建主窗口
    if (BrowserWindow.getAllWindows().length === 0) {
      const window = createWindow()
      mainWindowRef = window
    }
  })

  // 数据持久化相关的 IPC 处理
  const dataPath = join(app.getPath('userData'), 'todolist-data.json')

  console.log('数据文件路径:', dataPath)

  // 保存数据
  ipcMain.handle('save-data', (_, data) => {
    try {
      const dir = join(app.getPath('userData'))
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true })
      }
      writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf8')
      console.log('数据保存成功:', data.length, '个任务')
      return true
    } catch (error) {
      console.error('保存数据失败:', error)
      return false
    }
  })

  // 加载数据
  ipcMain.handle('load-data', () => {
    try {
      console.log('尝试加载数据，文件存在:', existsSync(dataPath))
      if (existsSync(dataPath)) {
        const data = readFileSync(dataPath, 'utf8')
        const parsedData = JSON.parse(data)
        console.log('数据加载成功:', parsedData.length, '个任务')
        return parsedData
      }
      console.log('数据文件不存在，返回空数组')
      return []
    } catch (error) {
      console.error('加载数据失败:', error)
      return []
    }
  })

  // 处理渲染进程的同步请求
  ipcMain.handle('get-cwd', () => {
    return process.cwd()
  })
})

// 监听所有窗口关闭事件
app.on('window-all-closed', () => {
  // 如果不是 macOS 系统，则退出应用
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

// 在这个文件中可以继续添加应用的其他主进程代码
// 也可以将它们放在单独的文件中并在这里引入
