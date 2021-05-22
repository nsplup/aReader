interface Library {
  history: Array<Infomation>
  categories: Array<Category>
}

interface Infomation {
  tittle: string
  format: 'ePub' | 'Text'
  createdTime: number
  cover: string /** Path String */
  menifest: Array<any> /** to-do: T类型声明 */
  spine: Array<any> /** to-do: T类型声明 */
  nav: Array<any> /** to-do: T类型声明 */
  navMap: any /** to-do: T类型声明 */
  bookmark: Bookmark
  encode?: string
}

interface Category {
  name: string
  books: Array<Infomation>
}

interface Bookmark {
  default: Array<number>
  detail: Array<number>
}