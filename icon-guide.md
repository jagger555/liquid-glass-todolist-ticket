# Electron Builder 图标准备指南

## 📁 目录结构
```
build/
├── icon.ico          # Windows 图标 (256x256)
├── icon.icns         # macOS 图标 (512x512)
├── icon.png          # Linux 图标 (512x512)
├── installerIcon.ico # Windows 安装程序图标 (可选)
└── background.png    # macOS DMG 背景图 (可选)
```

## 🖼️ 图标规格要求

### Windows (.ico)
- **主图标**: `build/icon.ico`
- **尺寸**: 256x256 像素 (推荐包含多个尺寸: 16, 32, 48, 64, 128, 256)
- **格式**: ICO 格式
- **用途**: 应用程序图标、任务栏图标、文件关联图标

### macOS (.icns)
- **主图标**: `build/icon.icns`
- **尺寸**: 512x512 像素 (推荐包含多个尺寸: 16, 32, 64, 128, 256, 512, 1024)
- **格式**: ICNS 格式
- **用途**: 应用程序图标、Dock 图标、Finder 图标

### Linux (.png)
- **主图标**: `build/icon.png`
- **尺寸**: 512x512 像素
- **格式**: PNG 格式 (透明背景)
- **用途**: 应用程序图标、桌面图标

## 🛠️ 图标制作工具

### 在线工具
1. **ICO Convert**: https://icoconvert.com/
2. **CloudConvert**: https://cloudconvert.com/
3. **Favicon Generator**: https://www.favicon-generator.org/

### 桌面工具
1. **Adobe Photoshop** - 专业图像编辑
2. **GIMP** - 免费开源图像编辑器
3. **Sketch** (macOS) - UI/UX 设计工具
4. **Figma** - 在线设计工具

### 命令行工具
```bash
# 使用 ImageMagick 转换图标
# 安装: brew install imagemagick (macOS) 或 apt install imagemagick (Linux)

# PNG 转 ICO
magick icon.png -define icon:auto-resize=256,128,64,48,32,16 icon.ico

# PNG 转 ICNS (需要额外工具)
# macOS: 使用 iconutil
mkdir icon.iconset
sips -z 16 16 icon.png --out icon.iconset/icon_16x16.png
sips -z 32 32 icon.png --out icon.iconset/icon_16x16@2x.png
sips -z 32 32 icon.png --out icon.iconset/icon_32x32.png
sips -z 64 64 icon.png --out icon.iconset/icon_32x32@2x.png
sips -z 128 128 icon.png --out icon.iconset/icon_128x128.png
sips -z 256 256 icon.png --out icon.iconset/icon_128x128@2x.png
sips -z 256 256 icon.png --out icon.iconset/icon_256x256.png
sips -z 512 512 icon.png --out icon.iconset/icon_256x256@2x.png
sips -z 512 512 icon.png --out icon.iconset/icon_512x512.png
sips -z 1024 1024 icon.png --out icon.iconset/icon_512x512@2x.png
iconutil -c icns icon.iconset
```

## 🎨 设计建议

### 便签应用图标设计
1. **主题元素**:
   - 📝 笔记本、便签纸
   - ✅ 复选框、对勾
   - 📋 剪贴板
   - 🗒️ 便签贴

2. **颜色方案**:
   - 温暖色调: 黄色、橙色 (模拟便签纸)
   - 清新色调: 蓝色、绿色 (现代感)
   - 简约色调: 灰色、白色 (极简风格)

3. **设计原则**:
   - 简洁明了，避免过多细节
   - 在小尺寸下仍然清晰可辨
   - 与应用功能相关联
   - 符合各平台设计规范

## 📋 快速制作步骤

### 方法一: 使用现有图标
1. 从图标库下载 SVG 或高分辨率 PNG
   - **Feather Icons**: https://feathericons.com/
   - **Heroicons**: https://heroicons.com/
   - **Material Icons**: https://fonts.google.com/icons

2. 使用在线工具转换格式
3. 放置到 `build/` 目录

### 方法二: 简单设计
1. 创建 512x512 的 PNG 图像
2. 使用简单的几何形状和图标
3. 确保背景透明
4. 转换为各平台所需格式

## 🔧 自动化脚本

创建 `scripts/build-icons.js`:
```javascript
const sharp = require('sharp');
const fs = require('fs');

async function generateIcons() {
  const inputIcon = 'assets/icon-source.png'; // 源图标文件
  
  // 确保 build 目录存在
  if (!fs.existsSync('build')) {
    fs.mkdirSync('build');
  }
  
  // 生成不同尺寸的 PNG
  const sizes = [16, 32, 48, 64, 128, 256, 512];
  
  for (const size of sizes) {
    await sharp(inputIcon)
      .resize(size, size)
      .png()
      .toFile(`build/icon-${size}.png`);
  }
  
  // 生成主图标
  await sharp(inputIcon)
    .resize(512, 512)
    .png()
    .toFile('build/icon.png');
    
  console.log('图标生成完成！');
}

generateIcons().catch(console.error);
```

## ⚠️ 注意事项

1. **版权问题**: 确保使用的图标有合适的许可证
2. **文件大小**: 图标文件不要过大，影响应用体积
3. **平台适配**: 不同平台的图标风格可能需要微调
4. **测试**: 在不同分辨率和主题下测试图标显示效果
5. **备份**: 保留源文件，便于后续修改

## 📦 打包时的图标配置

在 `electron-builder.yml` 中:
```yaml
win:
  icon: build/icon.ico
mac:
  icon: build/icon.icns
linux:
  icon: build/icon.png
```

如果没有准备图标文件，Electron Builder 会使用默认图标，但建议为应用准备专属图标以提升专业度。
