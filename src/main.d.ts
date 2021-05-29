interface Library {
  /** 书架，值为HASH */
  shelf: string[]
  /** 书籍数据，保存时不包含manifest/spine */
  data: {
    [key: string]: Infomation
  }
}

interface Infomation {
  /** SHA256 */
  hash: string
  /** 书籍标题 */
  title: string
  /** 书籍格式 */
  format: 'EPUB' | 'TEXT'
  /** 导入时间 */
  createdTime: number
  /** 封面路径 */
  cover: string | null
  /** 书籍内容 */
  manifest: Manifest
  /** 书籍排版顺序 */
  spine: Array<string>
  /** 书籍目录 */
  nav: Array<Nav>
  /** 书签 */
  bookmark: Bookmark
}

interface Bookmark {
  /** 格式：[页码，页面百分比] */
  history: Array<number>
  detail: number[][]
}

interface UserConfig {
  /** 电子书渲染模式 */
  renderMode: 'scroll' | 'page'
  /** 字体样式 */
  fontStyle: FontStyle
  /** 配色方案 */
  colorPlan: ColorPlan
}

interface FontStyle {
  /** 字体系列 */
  fontFamily: string
  /** 字体大小 */
  fontSize: number
  /** 首行缩进 */
  textIndent: number
  /** 行高 */
  lineHeight: number
}

interface ColorPlan {
  /** 当前配色方案；值为基础方案的下标；-1代表自定义方案 */
  current: number
  /** 自定义配色方案；[文本颜色, 背景颜色] */
  custom: Array<string>
}

interface Manifest {
  [id: string]: {
    href: string,
    'media-type': string
  }
}

interface Nav {
  id: string
  navLabel: string
  href: string
  isSub: boolean
}