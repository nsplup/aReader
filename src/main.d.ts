interface Library {
  /** 最近阅读 */
  history: Array<Infomation>
  /** 分类书架 */
  categories: Array<Category>
}

interface Infomation {
  /** 书籍标题 */
  title: string
  /** 书籍格式 */
  format: 'EPUB' | 'TEXT'
  /** 导入时间 */
  createdTime: number
  /** 封面路径 */
  cover: string | null
  /** 书籍内容 */
  manifest: Array<Manifest>
  /** 书籍排版顺序 */
  spine: Array<string>
  /** 书籍目录 */
  nav: Array<Nav>
  /** 书签 */
  bookmark: Bookmark
  /** Text 格式编码类型 */
  encode: string
}

interface Category {
  name: string
  books: Array<Infomation>
}

interface Bookmark {
  default: Array<number>
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
  fontSize: string
  /** 首行缩进 */
  textIndent: string
  /** 行高 */
  lineHeight: string
}

interface ColorPlan {
  /** 当前配色方案；值为基础方案的下标；-1代表自定义方案 */
  current: number
  /** 自定义配色方案；[文本颜色, 背景颜色] */
  custom: Array<string>
}

interface Manifest {
  id: string
  href: string
}

interface Nav {
  id: string
  navLabel: string
  href: string
  isSub: boolean
}