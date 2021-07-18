# 镜览 / aReader

<h3 align="center">🚸Electron注意</h3>

<p align="center">这个应用使用了<b>Electron</b></p>

[![screenshot](https://z3.ax1x.com/2021/05/31/2mA2sx.png)](https://imgtu.com/i/2mA2sx)

# Unsupported

⛔图片：镜览会移除所有非注音标签，其中包含图片标签

⛔超链接：原因同上，超链接标签会变为通用文本

⛔使用锚点的目录：镜览不会处理使用锚点的目录，它们不会出现在目录菜单中

# Feature

- 📚书架
  - ✅导入书籍
  - ✅移除书籍
  - 分类
  - 搜索
  - 排序
  - 显示模式
  - ✅进度
- 📖阅读
  - ✅目录
    - ✅书签
  - 阅读模式
    - ✅滚动模式
    - ✅分页模式
  - 字体
    - ✅字体类型
    - ✅字体大小
    - ✅首行缩进
    - ✅行高
  - 颜色配置
    - ✅基础方案
    - ✅文本颜色
    - ✅背景颜色
  - ✅全文检索
  - ✅进度
  - ✅跳转
  - ✅全屏模式
  - ✅快捷键（N/Prev，M/Next）
- 💡格式支持
  - ✅EPUB
  - ✅TEXT

# Q&A

### Q: 为什么书籍打开后一片空白？

> A: 可能是当前章节只包含图片，可以使用目录或向前后跳转几个章节

### Q: 为什么书籍封面突然不显示了？

> A: 可能是你曾经移动过镜览的安装目录，书籍封面使用的是绝对路径，你可能需要删除书籍后重新导入

# License
```
镜览
Apache 2.0
Copyright 2021 Luke Pan
https://github.com/nsplup/aReader

unDraw
Copyright 2021 Katerina Limpitsouni
https://undraw.co/

REMIX ICON
Apache 2.0
Copyright 2020 Remix Design
http://remixicon.com/

node-7z
ISC License
Copyright 2014-2019, Quentin Rossetti quentin.rossetti@gmail.com
https://github.com/quentinrossetti/node-7z

7zip
GNU LGPL
Copyright (C) 1999-2015 Igor Pavlov.
https://github.com/fritx/win-7zip

jschardet
LGPL-2.1+
https://github.com/aadsm/jschardet
```
<p align="center">💕以及未在此列的MIT开源项目💕</p>
