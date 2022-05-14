import React, { useState, useEffect, useRef } from 'react'
import { FixedSizeList  } from 'react-window'
import { HexColorPicker } from 'react-colorful'
import AutoSizer from "react-virtualized-auto-sizer"
import Slider from 'react-slider'
import { classNames } from '@utils/classNames'
import { debounce } from '@utils/debounce'
import { formatTime } from '@utils/formatTime'
import { throttle } from '@utils/throttle'
import { LOAD_BOOK, READ_BOOK, SEARCH_RESULT, START_SEARCH, STOP_SEARCH, TOGGLE_FULLSCREEN } from '@constants'

import { decodeHTMLEntities } from '@utils/decodeEntities'

const searchPlaceholder = require('@static/illustration/undraw_Web_search_re_efla.svg').default

const CustomSlider = (props: any) => (
  <Slider
    { ...props }
    className="com-slider"
    thumbClassName="com-slider-thumb"
    trackClassName="com-slider-track"
    renderThumb={(tProps, state) => (
      <div { ...tProps }>
        <div className="com-slider-tips">
          { Math.floor(state.valueNow) }
        </div>
      </div>
    )}
  />
)

const ColorPlanRender = (text: string, background: string, index: number, current: number) => (
  <div
    style={{
      color: text,
      backgroundColor: background,
      transition: 'transform .2s ease-out, color .4s ease-in-out, background-color .4s ease-in-out'
    }}
    className={
      classNames(
        'flex-box s-m-color-plan common-active',
        { 's-m-color-plan-current': index === current }
      )
    }
    data-plan={ index }
    key={ index }
  >
    A
  </div>
)

const DisabledSelectInput = React.forwardRef((props: any, ref) => {
  const id = useRef(Date.now().toString(16))
  const [isFocusing, setIsFocusing] = useState(false)

  return (
    <div style={{ position: 'relative' }}>
      <input
        {...props}
        id={id.current}
        style={Object.assign({}, props.style, {
          visibility: isFocusing ? '' : 'hidden',
        })}
        onBlur={(e: any) => { setIsFocusing(false); props.onBlur && props.onBlur(e) }}
        ref={ref}
      />
      <label
        htmlFor={id.current}
        style={Object.assign({}, props.style, {
          display: 'inline-block',
          visibility: isFocusing ? 'hidden' : '',
          position: 'absolute',
          left: 0,
          cursor: 'text',
          overflow: 'hidden',
          whiteSpace: 'break-spaces',
          textOverflow: 'ellipsis',
          height: '100%',
        })}
        className={props.className}
        onClick={() => setIsFocusing(true)}
      >
        {props.value}
      </label>
    </div>
  )
})

const colorPlan = [
  ['#393939', '#ffffff'],
  ['#393939', '#efebdf'],
  ['#393939', '#e7d7bd'],
  ['#393939', '#deebcf'],
  ['#282828', '#a4a6a3'],
  ['#9c9a9d', '#000000'],
  ['#adadb5', '#29354b'],
  ['#5d788c', '#080b10'],
]
const customPlan = ['#b7a1ff', '#2e003e']

const defaultInfo: Infomation = {
  title: '',
  cover: null,
  format: 'EPUB',
  hash: '',
  nav: [],
  manifest: {},
  createdTime: 0,
  spine: [],
  bookmark: { history: [], detail: [] }
}

Object.freeze(defaultInfo)

interface Props {
  fonts: Array<string>
  isReaderActive: boolean
  handleClose: Function
  userconfig: UserConfig
  currentBookHash: string
  library: Library
  ipcRenderer: Electron.IpcRenderer
  handleToast: Function
  handleChangeLibrary: Function
  handleChangeUserConfig: Function
}

export default function Reader ({
  fonts,
  isReaderActive,
  handleClose,
  userconfig,
  currentBookHash,
  library,
  ipcRenderer,
  handleToast,
  handleChangeLibrary,
  handleChangeUserConfig,
}: Props): JSX.Element {
  /** 样式属性 */
  const [renderMode, setRenderMode] = useState<'page' | 'scroll'>('page') /** 可选值：page/scroll */

  const [fontFamily, setFontFamily] = useState('微软雅黑')
  const [fontSize, setFontSize] = useState(18)
  const [textIndent, setTextIndent] = useState(0)
  const [lineHeight, setLineHeight] = useState(15)

  const [cColorPlan, setCColorPlan] = useState(0)
  const [textColor, setTextColor] = useState(customPlan[0])
  const [backgroundColor, setBackgroundColor] = useState(customPlan[1])
  /** 状态属性 */
  const [sMenuStatus, setSMenuStatus] = useState(null) /** 可选值：null/nav/font/color/search */
  const [bookInfo, setBookInfo] = useState<Infomation>(Object.assign({}, defaultInfo))
  const [pageNumber, setPageNumber] = useState(0)
  const [navMenuStatus, setNavMenuStatus] = useState(true)
  const [isWaiting, setIsWaiting] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [searchResult, setSearchResult] = useState([])
  const [isFullScreenEnabled, setIsFullScreenEnabled] = useState(false)
  const [isFocusingMode, setIsFocusingMode] = useState(false)
  /** 书籍内容 */
  const [content, setContent] = useState('')
  const [textCache, setTextCache] = useState(null)
  const navMap = useRef(null)
  const handleCloseSMenu = () => {
    setSMenuStatus(null)
  }

  const handleCloseReader = () => {
    handleClose(false)
    setSearchResult([])
    setKeyword('')
    setIsWaiting(false)
    ipcRenderer.send(STOP_SEARCH)
    handleToggleFullScreen(false)
    document.body.style.overflow = 'auto'
    setTimeout(() => {
      setBookInfo(Object.assign({}, defaultInfo))
      setTextCache(null)
      setPageNumber(0)
      setJumpValue(1)
      setContent('')
    }, 150)
  }

  const handleToggleFullScreen = (status: boolean) => {
    setIsFullScreenEnabled(status)
    ipcRenderer.send(TOGGLE_FULLSCREEN, status)
  }
  const [bookmarkCaller, setBookmarkCaller] = useState(0)
  const handleBookmark = (isRemoveEvent: boolean) => {
    let { bookmark } = bookInfo

    if (isRemoveEvent) {
      bookmark.detail = bookmark.detail.filter(([spine, prog]) => 
        !(spine === pageNumber && (Math.abs((prog * 100) - (progress * 100)) < 3))
      )
    } else {
      bookmark.detail = bookmark.detail.concat([[pageNumber, progress]])
    }
    bookmark = Object.assign({}, bookmark, {
      detail: [...bookmark.detail]
    })
    setBookInfo(bookInfo => Object.assign({}, bookInfo, { bookmark }))
    setBookmarkCaller(Date.now())
  }
  const handleEmptyBookmark = () => {
    let { bookmark } = bookInfo
    bookmark = Object.assign({}, bookmark, {
      detail: []
    })
    setBookInfo(bookInfo => Object.assign({}, bookInfo, { bookmark }))
    setBookmarkCaller(Date.now())
  }

  const contentEl = useRef<HTMLDivElement>(null)
  const renderEl = useRef<HTMLDivElement>(null)
  const handleRestScroll = () => {
    contentEl.current.scrollTo(0, 0)
  }
  const [renderCount, setRenderCount] = useState(0)
  const [progress, setProgress] = useState(0)
  const computeTotalRenderCount = () => {
    const { current } = renderEl
    const { offsetWidth } = current

    const nodeList = Array.from(current.childNodes)
    const { length } = nodeList
    if (length > 0) {
      const lastNode = nodeList[length - 1]
      const { offsetLeft } = lastNode as HTMLElement
      
      return Math.floor(offsetLeft / (offsetWidth + 100))
    } else {
      return 0
    }
  }
  const handleChangeRenderCount = (offset: number) => {
    if (renderMode === 'page') {
      const totalCount = computeTotalRenderCount()
      const computedCount = Math.max(
        0,
        Math.min(
          renderCount + offset,
          totalCount
        )
      )
      setRenderCount(computedCount)
      let prog = computedCount / totalCount
      setProgress(isNaN(prog) ? 0 : prog)
    }
  }
  const handleWheel = (e: React.WheelEvent) => {
    const { deltaY } = e
    handleChangeRenderCount(
      deltaY > 0 ? 1 : -1
    )
  }
  const handleScroll = () => {
    if (renderMode === 'scroll') {
      const { current } = contentEl
      const { scrollHeight, scrollTop, offsetHeight } = current
      const computedHeight = scrollHeight - offsetHeight

      let prog = scrollTop / computedHeight
      setProgress(isNaN(prog) ? 0 : prog)
    }
  }
  const handleToggleRenderMode = () => {
    if (renderMode === 'scroll') {
      setRenderMode('page')
    } else {
      setRenderMode('scroll')
    }
    setRenderCount(0)
    handleRestScroll()
    setProgress(0)
  }
  const handleResize = () => {
    if (renderMode === 'page') {
      const totalCount = computeTotalRenderCount()
      const computedCount = Math.floor(progress * totalCount)
      setRenderCount(computedCount)

      let prog = computedCount / totalCount
      setProgress(isNaN(prog) ? 0 : prog)
      /** 强制更新 */
      setTime(Date.now())
    }
  }

  /** 打开字体样式窗口事件 */
  const fontList = useRef(null)
  const handleOpenFontStyle = () => {
    setSMenuStatus('font')
    fontList.current.scrollToItem(fonts.indexOf(fontFamily), 'center')
  }
  const handleChangeFontFamily = (e: React.MouseEvent) => {
    let { target }: any = e
    let font = target.getAttribute('data-font')

    /** 处理事件目标 */
    if (!font) {
      target = target.parentElement
      font = target.getAttribute('data-font')
    }

    if (font) {
      setFontFamily(font)
    }
  }

  const handleChangeColorPlan = (e: React.MouseEvent) => {
    let { target }: any = e
    let plan = target.getAttribute('data-plan')

    /** 处理事件目标 */
    if (!plan) {
      target = target.parentElement
      plan = target.getAttribute('data-plan')
    }

    if (plan) {
      setCColorPlan(parseInt(plan))
    }
  }

  const handleStartSearch = () => {
    /** 调试模式入口 */
    if (keyword.startsWith('#*') && keyword.endsWith('*#')) {
      ipcRenderer.send(keyword.toUpperCase().slice(2, -2))
      return
    }
    if (keyword.length > 0) {
      setSearchResult([])
      setIsWaiting(true)
      ipcRenderer.send(START_SEARCH, { bookInfo, keyword })
    }
  }

  const [time, setTime] = useState(0)
  const setTimeWithThrottle = throttle(() => setTime(Date.now()), 300)
  const mouseEventTimer = useRef(null)
  const DELAY = 3000
  const [isToolsActive, setIsToolsActive] = useState(false)
  const handleMouseMoveTools = () => {
    clearTimeout(mouseEventTimer.current)
    setIsToolsActive(true)
    setTimeWithThrottle()

    mouseEventTimer.current = setTimeout(() => {
      setIsToolsActive(false)
    }, DELAY)
  }
  const handleMouseEnterTools = () => {
    clearTimeout(mouseEventTimer.current)
    setIsToolsActive(true)
  }
  const handleMouseLeaveTools = () => {
    mouseEventTimer.current = setTimeout(() => {
      setIsToolsActive(false)
    }, DELAY)
  }

  const navList = useRef(null)

  const handleJump = (href: string, progress = 0) => {
    const { format, hash } = bookInfo
    /** 当格式为TEXT并存在缓存时从缓存获取书籍内容 */
    if (format === 'TEXT' && textCache) {
      setContent(textCache[href])
      parseProg(progress)
    } else {
      ipcRenderer.send(READ_BOOK, {
        progress,
        href,
        hash,
        format,
      })
    }
  }

  const handleChangePage = (offset: number, progress = 0) => {
    const { spine, manifest } = bookInfo
    offset = Math.min(
      spine.length - 1,
      Math.max(0, offset + pageNumber)
    )

    /** 处理边界情况 */
    if (offset !== pageNumber) {
      handleJump(manifest[spine[offset]].href, progress)
      setPageNumber(offset)
      setJumpValue(offset + 1)
    }
  }

  const [jumpValue, setJumpValue] = useState(pageNumber + 1)
  const jumpValueBox = useRef(null)
  const handleInputToJump = () => {
    let newPageNumber = jumpValue - 1
    if (newPageNumber !== pageNumber) {
      const { spine, manifest } = bookInfo
      handleJump(manifest[spine[newPageNumber]].href, 0)
      setPageNumber(newPageNumber)
    }
  }
  /** 输入框失焦时数据处理 */
  const handleJumpValueBoxBlur = () => {
    if (isNaN(jumpValue)) {
      setJumpValue(pageNumber + 1)
    } else {
      const { spine } = bookInfo
      let newJumpValue = Math.min(
        spine.length - 1,
        Math.max(0, jumpValue - 1)
      ) + 1
      setJumpValue(newJumpValue)
      /** 输入框数据未被正确更新的权宜之计 */
      jumpValueBox.current.value = newJumpValue
    }
  }
  useEffect(() => {
    setJumpValue(pageNumber + 1)
    jumpValueBox.current.blur()
  }, [pageNumber, isToolsActive])

  const parseProg = (prog: number) => {
    if (renderMode === 'page') {
      setRenderCount(Math.ceil(prog * computeTotalRenderCount()))
    } else {
      const { scrollHeight, offsetHeight } = contentEl.current
      const computedHeight = scrollHeight - offsetHeight
      contentEl.current.scrollTo({ left: 0, top: computedHeight * prog })
    }
    setProgress(prog)
    /** 强制更新 */
    setTime(Date.now())
  }

  const [isNavShouldSquash, setIsNavShouldSquash] = useState(false)
  const handleClickNav = (e: React.MouseEvent) => {
    let { target }: any = e
    let href = target.getAttribute('data-href')

    /** 处理事件目标 */
    if (!href) {
      target = target.parentElement
      href = target.getAttribute('data-href')
    }

    if (href) {
      const index = parseInt(target.getAttribute('data-index'))
      if (index !== pageNumber) {
        handleJump(href)
        !isNavShouldSquash && handleCloseSMenu()
        setPageNumber(index)
        setJumpValue(index + 1)
      }
      if (isNavShouldSquash) {
        setIsNavShouldSquash(false)
        setTimeout(() => navList.current.scrollToItem(index, 'center'))
      }
    }
  }
  const handleClickBookmark = (e: React.MouseEvent) => {
    let { target }: any = e
    let prog = target.getAttribute('data-prog')

    /** 处理事件目标 */
    if (!prog) {
      target = target.parentElement
      prog = target.getAttribute('data-href')
    }

    if (prog) {
      prog = parseFloat(prog)
      const { spine } = bookInfo
      const href = target.getAttribute('data-href')
      const id = target.getAttribute('data-id')
      const index = spine.indexOf(id)
      const cId = spine[pageNumber]

      if (id !== cId) {
        handleJump(href, prog)
        setPageNumber(index)
        setJumpValue(index + 1)
      } else {
        parseProg(prog)
      }
      handleCloseSMenu()
    }
  }
  const bookmarkList = useRef(null)
  const handleScrollToLimit = (offset: number) => {
    if (navMenuStatus) {
      const { current } = navList
      current.scrollToItem(offset)
    } else {
      const { current } = bookmarkList
      current.scrollTo(0, Math.min(offset, current.scrollHeight))
    }
  }
  const handleToggleNavSquashable = () => {
    setIsNavShouldSquash(!isNavShouldSquash)
    if (isNavShouldSquash) {
      setTimeout(() => navList.current.scrollToItem(pageNumber, 'center'))
    } else {
      navList.current.scrollToItem(0)
    }
  }
  const handleOpenNavList = () => {
    const { current } = navList
    setSMenuStatus('nav')
    setIsToolsActive(false)
    current.scrollToItem(isNavShouldSquash ? 0 : pageNumber, 'center')
  }
  const handleClickSearchResult = (e: React.MouseEvent) => {
    let { target }: any = e
    let href = target.getAttribute('data-href')

    /** 处理事件目标 */
    if (!href) {
      target = target.parentElement
      href = target.getAttribute('data-href')
    }

    if (href) {
      const prog = parseFloat(target.getAttribute('data-prog'))
      const id = target.getAttribute('data-id')
      const index = bookInfo.spine.indexOf(id)
      if (index !== pageNumber) {
        handleJump(href, prog)
        setPageNumber(index)
        setJumpValue(index + 1)
      } else {
        parseProg(prog)
      }
    }
  }

  useEffect(() => {
    if (typeof library === 'object' && currentBookHash.length > 0) {
      const bookData = Object.assign({}, defaultInfo, library.data[currentBookHash])
      setBookInfo(bookData)
    }
  }, [library, currentBookHash, isReaderActive])

  /** 历史记录、书签保存及上传 */
  useEffect(() => {
    if (typeof library === 'object' && isReaderActive) {
      let { bookmark, hash } = bookInfo
      bookmark = Object.assign({}, bookmark, {
        history: [pageNumber, progress]
      })
      const { data } = library
  
      data[hash] = Object.assign({}, bookInfo, { bookmark })
      handleChangeLibrary(Object.assign({}, library, { data }))
    }
  }, [progress, pageNumber, bookmarkCaller])

  /** page模式下窗口变换事件处理 */
  useEffect(() => {
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [progress])

  /** 获取书籍数据并跳转到相关章节 */
  useEffect(() => {
    if (typeof library === 'object' && currentBookHash.length > 0 && isReaderActive) {
      const bookData = Object.assign({}, defaultInfo, library.data[currentBookHash])
      setBookInfo(bookData)
      const { bookmark, spine, manifest } = bookData
      if (bookmark.history.length === 2) {
        const [pnum, prog] = bookmark.history
        const { href } = manifest[spine[pnum]]
  
        handleJump(href, prog)
        setPageNumber(pnum)
      } else {
        const { href } = manifest[spine[0]]
        handleJump(href)
        setPageNumber(0)
      }
    }
  }, [isReaderActive])

  /** 快捷键支持:
   * ESC: 退出全屏模式
   * F: 切换全屏模式
   * N: 上一页
   * M: 下一页
   */
  useEffect(() => {
    function hotkeySupport (e: KeyboardEvent) {
      if (isReaderActive && sMenuStatus === null) {
        let key = e.key.toLocaleUpperCase()
        switch (key) {
          case 'ESCAPE':
            handleToggleFullScreen(false)
            break
          case 'F':
            handleToggleFullScreen(!isFullScreenEnabled)
            break
          case 'N':
          case 'M':
            const offset = (key === 'N' && -1) || (key === 'M' && 1)
            
            if (typeof offset === 'boolean') { return }
            if (renderMode === 'page') {
              if (offset === 1 && renderCount === computeTotalRenderCount()) {
                handleChangePage(1)
                return
              } else if (offset === -1 && renderCount === 0) {
                handleChangePage(-1, 1)
                return
              }
              handleChangeRenderCount(offset)
            } else if (renderMode === 'scroll') {
              const { current } = contentEl
              const { offsetHeight, scrollHeight, scrollTop } = current
              const computedScrollHeight = scrollHeight - offsetHeight
              const distance = parseInt(window.getComputedStyle(current)['fontSize'])
              const rate = Math.ceil((scrollTop + (distance * offset * 15)) / distance)
    
              if (offset === 1 && (computedScrollHeight - scrollTop) < 1) {
                handleChangePage(1)
                return
              } else if (offset === -1 && scrollTop === 0) {
                handleChangePage(-1, 1)
                return
              }
              current.scrollTo({ top: distance * rate, behavior: 'smooth' })
            }
            break
          case 'L':
            setIsFocusingMode(!isFocusingMode)
            if (isFocusingMode) {
              handleMouseMoveTools()
            } else {
              setIsToolsActive(false)
              clearTimeout(mouseEventTimer.current)
            }
            break
          case 'O':
          case 'P':
            const pageOffset = (key === 'O' && -1) || (key === 'P' && 1)
            handleChangePage(pageOffset)
            break
        }
      }
    }

    window.addEventListener('keyup', hotkeySupport)
    return () => {
      window.removeEventListener('keyup', hotkeySupport)
    }
  }, [isReaderActive, renderMode, pageNumber, renderCount, sMenuStatus, isFullScreenEnabled, isFocusingMode])

  /** 构建映射表 */
  useEffect(() => {
    navMap.current = {}
    bookInfo.nav.forEach(({ id, navLabel }) => { navMap.current[id] = navLabel })

    const loadBookListener = (event: Electron.IpcRendererEvent, {
      content, status, href, progress, format
    }: any) => {
      if (status === 'fail') {
        handleToast(['缓存文件已丢失，请重新导入书籍。'])
        handleCloseReader()
        return
      }
      if (format === 'TEXT') {
        setTextCache(content)
        content = content[href]
      }
      setContent(content)
      parseProg(progress)
    }
    ipcRenderer.on(LOAD_BOOK, loadBookListener)

    return () => {
      ipcRenderer.off(LOAD_BOOK, loadBookListener)
    }
  }, [bookInfo])

  /** 响应样式变更 */
  const [contentStyle, setContentStyle] = useState({})
  const [styleCSS, setStyleCSS] = useState({
    color: '',
    backgroundColor: '',
    cursor: '',
  })
  const handleChangeStyle = debounce(() => {
    let color: string, bgColor: string

    if (cColorPlan === -1) {
      color = textColor
      bgColor = backgroundColor
    } else {
      const [front, back] = colorPlan[cColorPlan]
      color = front
      bgColor = back
    }
    
    setContentStyle(style => Object.assign({}, style, {
      color,
      fontFamily,
      fontSize: Math.floor(fontSize) + 'px',
      backgroundColor: bgColor
    }))
    setStyleCSS(CSS => Object.assign({}, CSS, { color, backgroundColor: bgColor }))
  }, 150)
  useEffect(handleChangeStyle, [
    fontFamily, fontSize, textColor, backgroundColor, cColorPlan
  ])

  const handleResetCustomPlan = () => {
    setTextColor(customPlan[0])
    setBackgroundColor(customPlan[1])
  }

  useEffect(() => {
    setStyleCSS(CSS => Object.assign({}, CSS, { cursor: isToolsActive || sMenuStatus !== null ? 'auto' : 'none' }))
  }, [isToolsActive, sMenuStatus])

  const [CSSText, setCSSText] = useState('')
  useEffect(() => {
    const { color, backgroundColor, cursor } = styleCSS
    let computedCSSText = `
    .reader-wrapper * { cursor: ${cursor} };
    .reader-content::-webkit-scrollbar {
      width: 6px;
      height: 6px;
      background-color: transparent;
    }
    .reader-content::-webkit-scrollbar-track {
      background-color: transparent;
    }
    .reader-content::-webkit-scrollbar-thumb {
      border-radius: 10px;
      background-color: ${color};
    }
    .reader-content::-webkit-scrollbar-button {
      display: none;
    }
    .reader-content ::selection {
      color: ${backgroundColor} !important;
      background-color: ${color} !important;
    }

    .reader-content > div > * {
      margin-bottom: ${lineHeight}px;
    }
    .reader-content > div > *::before {
      width: ${textIndent}em;
    }
    `
    setCSSText(computedCSSText)
  }, [styleCSS, textIndent, lineHeight])

  /** 保存 .userconfig 设置 */
  useEffect(() => {
    const userconfig: UserConfig = {
      renderMode,
      fontStyle: {
        fontFamily,
        fontSize,
        textIndent,
        lineHeight
      },
      colorPlan: {
        current: cColorPlan,
        custom: [textColor, backgroundColor]
      }
    }
    handleChangeUserConfig(userconfig, true)
  }, [contentStyle, renderMode])

  /** 从userconfig获取用户样式配置 */
  useEffect(() => {
    const { renderMode, fontStyle, colorPlan } = userconfig
    const { fontFamily, fontSize, textIndent, lineHeight } = fontStyle
    const { current, custom } = colorPlan
    setRenderMode(renderMode)
    setFontFamily(fontFamily)
    setFontSize(fontSize)
    setTextIndent(textIndent)
    setLineHeight(lineHeight)
    setCColorPlan(current)
    setTextColor(custom[0])
    setBackgroundColor(custom[1])
  }, [userconfig])

  /** 搜索结果反馈 */
  useEffect(() => {
    const handleSearchResult = (event: Electron.IpcRendererEvent, result: any) => {
      const flatedResult: any = []
      setIsWaiting(false)
      result.forEach((res: any, index: number) => {
          const { result: cRes, id } = res
          cRes.forEach((resMap: any[], i: number) => {
            const [str, prog] = resMap
            flatedResult.push([id, str, prog])
          })
      })
      setSearchResult(flatedResult)
    }
    ipcRenderer.on(SEARCH_RESULT, handleSearchResult)

    return () => {
      ipcRenderer.off(SEARCH_RESULT, handleSearchResult)
    }
  }, [])

  return (
    <div
      className={
        classNames(
          'reader-wrapper',
          { 'reader-wrapper-active': isReaderActive }
        )
      }
    >
      <style dangerouslySetInnerHTML={{ __html: CSSText }}></style>
      <div
        className={
          classNames(
            'reader-content',
            renderMode === 'scroll'
              ? 'reader-content-scroll'
              : 'reader-content-page'
          )
        }
        ref={ contentEl }
        onWheel={ handleWheel }
        onScroll={ handleScroll }
        onMouseMove={ handleMouseMoveTools }
        onMouseLeave= { () => { setIsToolsActive(false) } }
        onClick={ () => { setIsToolsActive(false); clearTimeout(mouseEventTimer.current) } }
        style={ contentStyle }
      >
        <div
          style={{
            display: renderMode === 'page' ? '' : 'none',
            position: 'fixed',
            left: 0,
            bottom: 0,
            width: progress * 100 + '%',
            height: '6px',
            backgroundColor: styleCSS.color,
            transition: 'width .3s ease, background .3s ease',
          }}
        ></div>
        {
          (() => {
            if (bookInfo.hash !== '' && renderMode === 'page') {
              let total = (computeTotalRenderCount() + 1).toString()
              let current = (renderCount + 1).toString()
              return (<p
                style={{
                  display: 'inline-block',
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: '12px',
                  margin: '0',
                  fontSize: '12px',
                  color: styleCSS.color,
                  textAlign: 'center',
                  fontWeight: 'bold',
                  userSelect: 'none',
                }}
              >
                {`${'0'.repeat(Math.max(total.length - current.length, 0))}${current} / ${total}`}
              </p>)
            }
            return null
          })()
        }
        <span
          style={{
            display: 'flex',
            position: 'absolute',
            left: '2px',
            bottom: '7px',
            padding: '5px',
            borderRadius: '50%',
            color: styleCSS.color,
            visibility: isFocusingMode ? 'visible' : 'hidden',
            userSelect: 'none',
            fontSize: '15px',
          }}
        >
          <span className="ri-moon-fill" style={{ margin: 0 }}></span>
        </span>
        <div
          dangerouslySetInnerHTML={{
            __html: content
              .split(/[\r\n]+/)
              .filter(line => /\S+/.test(line))
              .map(str => `<p>${str.trim()}</p>`)
              .join('')
          }}
          ref={ renderEl }
          style={{
            transform: renderCount > 0 && renderMode === 'page'
              ? `translate3d(calc(-${renderCount * 100}% - ${ renderCount * 100 }px), 0, 0)`
              : ''
          }}
        ></div>
      </div>
      <div
        className={
          classNames(
            'flex-box reader-detail',
            {
              'reader-tools-focus': !isFocusingMode
                && (isToolsActive || (sMenuStatus !== null && sMenuStatus !== 'nav'))
            }
          )
        }
        onMouseEnter={ handleMouseEnterTools }
        onMouseLeave={ handleMouseLeaveTools }
      >
        {
          typeof library === 'object' && currentBookHash.length > 0
          ? (
            <>
              <p
                style={{
                  fontSize: '23px',
                  fontWeight: 'bold',
                  opacity: '0.8',
                  textAlign: 'center',
                }}
              >
                {decodeHTMLEntities(bookInfo.title)}
              </p>
              <p
                style={{
                  position: 'absolute',
                  bottom: '10px',
                  width: '100px',
                  opacity: '0.6',
                  fontSize: '14px',
                }}
              >
                {`${'0'.repeat(Math.max(bookInfo.spine.length.toString().length - (pageNumber + 1).toString().length, 0))}${pageNumber + 1} / ${bookInfo.spine.length}`}
              </p>
              <p
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: '10px',
                  width: 'calc(100% - 300px)',
                  margin: '0 auto',
                  textAlign: 'center',
                  opacity: '0.6',
                  fontSize: '14px',
                }}
              >
                {decodeHTMLEntities(navMap.current[bookInfo.spine[pageNumber]])}
              </p>
              <p
                style={{
                  position: 'absolute',
                  bottom: '10px',
                  right: '10px',
                  width: '120px',
                  opacity: '0.6',
                  fontSize: '14px',
                  textAlign: 'right',
                }}
              >
                {formatTime(time, 'YYYY/MM/DD hh:mm')}
              </p>
            </>
          )
          : null
        }
      </div>
      <div
        className={
          classNames(
            'flex-box reader-tools',
            {
              'reader-tools-focus': !isFocusingMode
                && (isToolsActive || (sMenuStatus !== null && sMenuStatus !== 'nav'))
            }
          )
        }
        onMouseEnter={ handleMouseEnterTools }
        onMouseLeave={ handleMouseLeaveTools }
      >
        <i className="reader-tool common-active ri-arrow-left-line" onClick={ handleCloseReader }>
          <span className="reader-tool-tips">返回</span>
        </i>
        {
          bookInfo.bookmark.detail.some(([spine, prog]) => 
          spine === pageNumber && (Math.abs((prog * 100) - (progress * 100)) < 3)
        )
          ? (
            <i
              className="reader-tool common-active ri-bookmark-fill reader-tool-enabled"
              onClick={ () => handleBookmark(true) }
            >
              <span className="reader-tool-tips">移除书签</span>
            </i>
          )
          : (
            <i
              className="reader-tool common-active ri-bookmark-line"
              onClick={ () => handleBookmark(false) }
            >
              <span className="reader-tool-tips">插入书签</span>
            </i>
          )
        }
        <i
          className={
            classNames(
              'reader-tool common-active ri-file-paper-2-line',
              { 'reader-tool-enabled': renderMode === 'scroll' }
            )
          }
          onClick={ handleToggleRenderMode }
        >
          {
            renderMode === 'scroll'
            ? (<span className="reader-tool-tips">分页模式</span>)
            : (<span className="reader-tool-tips">滚动模式</span>)
          }
        </i>
        <i className="reader-tool common-active ri-list-unordered" onClick={ handleOpenNavList }>
          <span className="reader-tool-tips">目录</span>
        </i>
        <i className="reader-tool common-active ri-text" onClick={ handleOpenFontStyle }>
          <span className="reader-tool-tips">字体样式</span>
        </i>
        <i className="reader-tool common-active ri-palette-fill" onClick={() => setSMenuStatus('color')}>
          <span className="reader-tool-tips">配色方案</span>
        </i>
        <i className="reader-tool common-active ri-search-line" onClick={() => setSMenuStatus('search')}>
          <span className="reader-tool-tips">全文检索</span>
        </i>
        <i
          className={
            classNames(
              'reader-tool common-active ri-skip-back-fill',
              { 'reader-tool-disabled': pageNumber === 0 },
            )
          }
          onClick={() => handleChangePage(-1)}
        >
          <span className="reader-tool-tips">上一章</span>
        </i>
        <DisabledSelectInput
          type="number"
          className="reader-input"
          style={{ userSelect: 'none', fontSize: '14px', boxSizing: 'border-box' }}
          onInput={(e: any) => { setJumpValue(parseInt((e.target as HTMLInputElement).value)); handleMouseEnterTools() }}
          onBlur={handleJumpValueBoxBlur}
          value={jumpValue}
          ref={jumpValueBox}
        />
        <i
          className={
            classNames(
              'reader-tool common-active ri-guide-fill',
              {
                'reader-tool-disabled': isNaN(jumpValue)
                || (jumpValue - 1) === pageNumber
                || jumpValue < 1
                || ((pageNumber + 1) === bookInfo.spine.length && jumpValue > pageNumber)
              },
            )
          }
          onClick={handleInputToJump}
        >
          <span className="reader-tool-tips">跳转</span>
        </i>
        <i
          className={
            classNames(
              'reader-tool common-active ri-skip-forward-fill',
              { 'reader-tool-disabled': pageNumber === (bookInfo.spine.length - 1) },
            )
          }
          onClick={() => handleChangePage(1)}
        >
          <span className="reader-tool-tips">下一章</span>
        </i>
        {
          isFullScreenEnabled
          ? (
            <i
              className="reader-tool common-active ri-fullscreen-exit-line"
              onClick={ () => handleToggleFullScreen(false) }
            >
              <span className="reader-tool-tips">退出全屏</span>
            </i>
          )
          : (
            <i
              className="reader-tool common-active ri-fullscreen-line"
              onClick={ () => handleToggleFullScreen(true) }
            >
              <span className="reader-tool-tips">全屏模式</span>
            </i>
          )
        }
      </div>
      <div
        className="common-mask"
        style={{
          zIndex: sMenuStatus !== null ? 999 : -1
        }}
        onClick={handleCloseSMenu}
      ></div>
      <div
        className={
          classNames(
            'secondary-menu',
            { 's-m-active': sMenuStatus !== null && sMenuStatus !== 'nav' }
          )
        }
      >
        {/* 字体样式 */}
        <div
          style={{
            display: sMenuStatus === 'font' ? 'flex' : 'none'
          }}
          className="flex-box s-m-font"
          onClick={ handleChangeFontFamily }
        >
          <div className="flex-box s-m-font-style">
            <div className="flex-box s-m-row">
              <p className="s-m-title">字体大小</p>
              <CustomSlider
                min={12}
                max={50}
                step={1}
                value={ fontSize }
                onChange={ (val: number) => setFontSize(val) }
              />
            </div>
            <div className="flex-box s-m-row">
              <p className="s-m-title">首行缩进</p>
              <CustomSlider
                max={10}
                step={1}
                value={ textIndent }
                onChange={ (val: number) => setTextIndent(val) }
              />
            </div>
            <div className="flex-box s-m-row">
              <p className="s-m-title">行距</p>
              <CustomSlider
                max={50}
                step={1}
                value={ lineHeight }
                onChange={ (val: number) => setLineHeight(val) }
              />
            </div>
          </div>
          <FixedSizeList
            width={ 280 }
            height={ 170 }
            itemCount={ fonts.length }
            itemSize={ 50 }
            ref={ fontList }
          >
            {
              ({ index, style }) => {
                const font = fonts[index]
                return (
                  <p
                    style={ Object.assign({ fontFamily: font }, style) }
                    key={ index }
                    data-font={ font }
                    className={
                      classNames(
                        'common-ellipsis common-active s-m-font-item',
                        { 's-m-font-item-active': font === fontFamily}
                      )
                    }
                  >
                    { font }
                  </p>
                )
              }
            }
          </FixedSizeList>
        </div>
        {/* 配色方案 */}
        <div
          style={{
            display: sMenuStatus === 'color' ? 'flex' : 'none'
          }}
          className="flex-box s-m-color"
          onClick={ handleChangeColorPlan }
        >
          <div className="flex-box s-m-row" style={{ padding: '0' }}>
            <p className="s-m-title">基础方案</p>
            <div
              className="flex-box"
              style={{
                justifyContent: 'space-between',
                width: '500px',
              }}
            >
              {
                colorPlan.map((plan, index) => ColorPlanRender(plan[0], plan[1], index, cColorPlan))
              }
            </div>
            <div
              className="flex-box"
              style={{
                justifyContent: 'space-between',
                width: '100%',
                marginTop: '30px',
              }}
            >
              <div className="s-m-color-picker">
                <p className="s-m-title">文本颜色</p>
                <HexColorPicker onChange={ (val) => setTextColor(val) } color={ textColor }/>
              </div>
              <div className="s-m-color-picker" style={{ marginRight: 'unset' }}>
                <p className="s-m-title">背景颜色</p>
                <HexColorPicker onChange={ (val) => setBackgroundColor(val) } color={ backgroundColor }/>
              </div>
              <div
                className="flex-box"
                style={{
                  flexDirection: 'column',
                  justifyContent: 'space-around',
                  width: '100px',
                  height: '130px',
                }}
              >
                { ColorPlanRender(textColor, backgroundColor, -1, cColorPlan) }
                <p
                  className="s-m-title reader-tool common-active"
                  style={{ margin: 0, padding: '10px' }}
                  onClick={ handleResetCustomPlan }
                >自定义方案</p>
              </div>
            </div>
          </div>
        </div>
        {/* 全文检索 */}
        <div
          style={{
            display: sMenuStatus === 'search' ? 'flex' : 'none'
          }}
          className="flex-box s-m-search"
        >
          <p className="s-m-title">全文检索</p>
          <img
            src={ searchPlaceholder }
            draggable="false"
            width="200px"
            style={{
              display: searchResult.length > 0 ? 'none' : '',
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: '25px',
              margin: 'auto',
            }}
          />
          <div style={{ position: 'relative' }}>
            <button className="flex-box s-m-search-btn" onClick={ handleStartSearch }>
              <i className="ri-search-line" style={{ color: '#ffffff' }}></i>
            </button>
            <DisabledSelectInput
              type="text"
              className="s-m-input"
              style={{ fontSize: '14px', boxSizing: 'border-box', lineHeight: '1.1' }}
              spellCheck="false"
              onInput={(e: any) => setKeyword((e.target as HTMLInputElement).value.trim())}
              value={ keyword }
            />
          </div>
          <div
            style={{ display: isWaiting ? '' : 'none' }}
            className={
              classNames(
                's-m-s-loading'
              )
            }
          >
            <div className="s-m-s-loading-slider"></div>
          </div>
          <div className="s-m-search-result" onClick={ handleClickSearchResult }>
            <FixedSizeList
              width={ 500 }
              height={ 220 }
              itemCount={ searchResult.length }
              itemSize={ 95 }
            >
              {
                ({index, style}) => {
                  const [id, str, prog] = searchResult[index]
                  const navLabel = navMap.current[id]
                  const { href } = bookInfo.manifest[id]
                  const pageNumber = bookInfo.spine.indexOf(id)
                  return (
                    <div
                      style={ style }
                      data-id={ id }
                      data-href={ href }
                      data-prog={ prog }
                      key={ index }
                      className="s-m-search-result-item common-active"
                    >
                      <p className="s-m-search-result-title">{ decodeHTMLEntities(typeof navLabel === 'string' ? navLabel : `章节 ${pageNumber + 1}`) }</p>
                      <p className="s-m-search-result-text">{ decodeHTMLEntities(str) }</p>
                      <span className="s-m-search-result-prog">{ Math.floor(prog * 100) }</span>
                    </div>
                  )
                }
              }
            </FixedSizeList>
          </div>
        </div>
      </div>
      <div
        className={
          classNames(
            'reader-nav',
            { 'reader-nav-active': sMenuStatus === 'nav' }
          )
        }
      >
        <div className="flex-box reader-nav-menu">
          <span
            className={
              classNames(
                'common-active',
                { 'reader-nav-m-active': navMenuStatus }
              )
            }
            onClick={ () => setNavMenuStatus(true) }
          >
            目录
          </span>
          <span
            className={
              classNames(
                'common-active',
                { 'reader-nav-m-active': !navMenuStatus }
              )
            }
            onClick={ () => setNavMenuStatus(false) }
          >
            书签
          </span>
        </div>
        <div
          style={{
            height: '100%',
            transform: navMenuStatus
              ? 'translate3d(0, 0, 0)'
              : 'translate3d(-100%, 0, 0)',
            transition: 'transform .2s ease-out'
          }}
          onClick={ handleClickNav }
        >
          <AutoSizer>
            {
              ({ width, height }) => {
                const nav = isNavShouldSquash
                  ? bookInfo.nav.filter(({ isSub }) => !isSub)
                  : bookInfo.nav
                return (
                  <FixedSizeList
                    width={ width }
                    height={ height }
                    itemCount={ nav.length }
                    itemSize={ 55 }
                    ref={ navList }
                  >
                    {
                      ({index, style}) => {
                        const { id, navLabel, href, isSub } = nav[index]
                        const pIndex = bookInfo.spine.indexOf(id)
                        const decodedNavLabel = decodeHTMLEntities(navLabel)
                        return (
                          <div
                            style={ style }
                            className={
                              classNames(
                                'common-active reader-nav-label',
                                { 'reader-nav-sub': isSub },
                                { 'reader-nav-label-active': pIndex === pageNumber },
                              )
                            }
                            data-href={ href }
                            data-index={ pIndex }
                            key={ index }
                            title={ decodedNavLabel }
                          >
                            <p>{ decodedNavLabel }</p>
                          </div>
                        )
                      }
                    }
                  </FixedSizeList>
                )
              }
            }
          </AutoSizer>
        </div>
        <div
          style={{
            position: 'absolute',
            top: '60px',
            left: 0,
            width: '100%',
            height: 'calc(100% - 115px)',
            overflowY: 'auto',
            transform: !navMenuStatus
              ? 'translate3d(0, 0, 0)'
              : 'translate3d(100%, 0, 0)',
            transition: 'transform .2s ease-out'
          }}
          onClick={ handleClickBookmark }
          ref={ bookmarkList }
        >
          <div
            className="flex-box"
            style={{
              flexDirection: 'column',
              justifyContent: 'flex-start',
              alignItems: 'flex-start',
            }}
          >
            {
              bookInfo.hash !== '' &&
              bookInfo.bookmark.detail.map(([spine, progress], index) => {
                const id = bookInfo.spine[spine]
                const { href } = bookInfo.manifest[id]
                const navLabel = typeof navMap.current[id] === 'string'
                  ? navMap.current[id]
                  : `章节 ${ spine + 1 }`
                const decodedNavLabel = decodeHTMLEntities(navLabel)
                return (
                  <p
                    data-href={ href }
                    data-prog={ progress }
                    data-id={ id }
                    className="common-active reader-bookmark"
                    key={ index }
                    title={ decodedNavLabel }
                  >
                    { decodedNavLabel }
                    <span className="reader-bookmark-prog">{ Math.floor(progress * 100) + '%' }</span>
                  </p>
                )
              })
            }
          </div>
        </div>
        <div className="reader-nav-tools flex-box">
          {
            navMenuStatus
            ? (
              <span className="reader-tool common-active" onClick={handleToggleNavSquashable}>
                { isNavShouldSquash ? '展开目录' : '折叠目录' }
              </span>
            )
            : (
              <span className="reader-tool common-active" onClick={handleEmptyBookmark}>
                清空书签
              </span>
            )
          }
          <span className="reader-tool common-active" style={{ visibility: 'hidden' }}>
            占位标签
          </span>
          <span className="reader-tool common-active" onClick={() => handleScrollToLimit(0)}>
            返回顶部
          </span>
          <span className="reader-tool common-active" onClick={() => handleScrollToLimit(Infinity)}>
            前往底部
          </span>
        </div>
      </div>
    </div>
  )
}