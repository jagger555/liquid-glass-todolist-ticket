# Liquid Glass TodoList Ticket

一个基于 Electron + Vue 3 + TypeScript 的桌面 TodoList 小工具。界面采用高透明液态玻璃风格，适合常驻桌面记录待办、拆分子任务，并在需要时切换为鼠标穿透的桌面小组件。

## 功能特性

- 液态玻璃界面：透明窗口、柔和边框、轻量玻璃质感。
- 桌面常驻体验：无边框窗口、可拖动、可置顶、可最小化。
- 底层穿透模式：开启后窗口不影响其他软件点击，适合作为桌面背景式清单。
- TodoList 管理：新增、编辑、删除、完成/取消完成任务。
- 子任务：每个任务可以继续添加子任务，并显示完成进度。
- 搜索与过滤：支持关键词搜索，以及全部、待办、已完成三种视图。
- 拖拽排序：在全部视图下可以拖拽调整任务顺序。
- 本地保存：任务数据保存到本机应用数据目录，关闭后再次打开仍会保留。
- 明暗主题：支持在浅色和深色主题之间切换。

## 快捷键

| 快捷键 | 功能 |
| --- | --- |
| `Ctrl + N` | 打开/收起新增任务区域 |
| `Ctrl + F` | 打开/收起搜索区域 |
| `Ctrl + T` | 切换窗口置顶 |
| `Ctrl + Alt + D` | 切换底层穿透模式 |
| `Ctrl + M` | 最小化窗口 |
| `Esc` | 退出编辑或关闭当前子任务输入 |
| `Enter` | 添加任务、添加子任务或确认编辑 |

macOS 下 `Ctrl` 可替换为 `Command`。

## 下载使用

Windows 用户可以在 GitHub Releases 页面下载最新安装包：

```text
便签TodoList-1.0.0-setup.exe
```

下载后双击安装即可运行。当前安装包未做代码签名，Windows 可能提示“未知发布者”，这是未签名 Electron 应用的常见提示。

## 本地开发

环境建议：

- Node.js 18 或更高版本
- npm

安装依赖：

```bash
npm install
```

启动开发模式：

```bash
npm run dev
```

类型检查和构建：

```bash
npm run build
```

## 技术栈

- Electron
- electron-vite
- Vue 3
- TypeScript
- SortableJS
- electron-builder

## 项目结构

```text
src/
  main/                 Electron 主进程
  preload/              预加载脚本和窗口 API 类型
  renderer/             Vue 渲染进程
    src/components/     TodoList 主界面组件
resources/              应用资源
electron-builder.yml    打包配置
```

## 说明

本项目目前主要面向 Windows 桌面使用。透明窗口、鼠标穿透、底层显示等能力依赖 Electron 和系统窗口管理机制，不同 Windows 版本上的视觉表现可能略有差异。

## License

当前仓库暂未添加开源许可证。如需正式开源发布，请补充 `LICENSE` 文件。
