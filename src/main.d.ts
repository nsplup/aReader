interface Library {
  history: Array<Infomation> /** 最近阅读 */
  categories: Array<Category> /** 分类书架 */
}

interface Infomation {
  title: string /** 书籍标题 */
  format: 'EPUB' | 'TEXT' /** 书籍格式 */
  createdTime: number /** 导入时间 */
  cover: string | false /** 书籍路径 */
  menifest: Array<any> /** to-do: T类型声明; 书籍内容 */
  spine: Array<any> /** to-do: T类型声明; 书籍排版顺序 */
  nav: Array<any> /** to-do: T类型声明; 书籍目录 */
  navMap: any /** to-do: T类型声明; 书籍目录映射表 */
  bookmark: Bookmark /** 书签 */
  encode?: string /** Text 格式编码类型 */
}

interface Category {
  name: string
  books: Array<Infomation>
}

interface Bookmark {
  default: Array<number>
  detail: Array<number>
}