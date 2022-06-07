import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { FixedSizeList  } from 'react-window'
import { HexColorPicker } from 'react-colorful'
import AutoSizer from "react-virtualized-auto-sizer"
import Slider from 'react-slider'
import { classNames } from '@utils/classNames'
import { formatTime } from '@utils/formatTime'
import { throttle } from '@utils/throttle'
import { clamp } from '@utils/clamp'
import { getComplementaryColor } from '@utils/getComplementaryColor'
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
          whiteSpace: 'nowrap',
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

const computeElementOverflowOrNot = (el: HTMLElement) => {
  const viewWidth = window.innerWidth || document.documentElement.clientWidth
  const { width } = el.getBoundingClientRect()
  /** column-width: 600, column-gap: 100, padding: 70 */
  const minPageWidth = 600 * 2 - 100 + 70

  return width > Math.min(viewWidth, minPageWidth)
}
/**
 * @returns [rect, el, lineCount, isOverflow]
 */
const getVisibleElements = (nodeList: HTMLElement[]) => {
  const computedChildren = nodeList
    .map((el, lineCount) => (
      [el.getBoundingClientRect(), el, lineCount, (computeElementOverflowOrNot(el))]
    ))
  const isScrollMode = (
    new Set(computedChildren.map(([rect]) => Math.floor((rect as DOMRect).x)))
      .size
  ) === 1

  return computedChildren.filter(([rect, el, lineCount, isOverflow]) => {
    if (isScrollMode) {
      const { bottom, top, height } = rect as DOMRect
      const viewHeight = window.innerHeight || document.documentElement.clientHeight

      return (top >= 0 && top <= viewHeight) ||
      Math.abs(bottom) + Math.abs(top) === height
    } else {
      const { left, right, width } = rect as DOMRect
      const viewWidth = window.innerWidth || document.documentElement.clientWidth

      return (left > 0 && left < viewWidth) ||
        (
          isOverflow &&
          (Math.abs(left) + Math.abs(right) === width)
        )
    }
  })
}

/** 移动至导入模块 */
const convertContent = (content: string) => {
  const lines = content.split(/[\r\n]+/)
  let startIndex, endIndex
  for (let i = 0, len = lines.length; i < len; i++) {
    if (lines[i].trim().length > 0) {
      startIndex = i
      break
    }
  }
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].trim().length > 0) {
      endIndex = i + 1
      break
    }
  }

  return lines
    .slice(startIndex, endIndex)
    .map(str => {
      const line = str.trim()
      return line.length > 0
      ? `<p>${line}</p>`
      : '<br>'
    })
    .join('')
}


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

class DefaultInfo {
  title = ''
  cover: string | null = null
  format: 'EPUB' | 'TEXT' = 'EPUB'
  hash = ''
  nav: Array<Nav> = []
  manifest = {}
  createdTime = 0
  spine: Array<string> = []
  bookmark: Bookmark = {
    trace: { pageNumber: 0, lineCount: 0 },
    detail: {}
  }
}

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
  const [bookInfo, setBookInfo] = useState<Infomation>(new DefaultInfo())
  const [pageNumber, setPageNumber] = useState(0)
  const [lineCount, setLineCount] = useState(0)
  const [navMenuStatus, setNavMenuStatus] = useState(true)
  const [isWaiting, setIsWaiting] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [searchResult, setSearchResult] = useState([])
  const [isFullScreenEnabled, setIsFullScreenEnabled] = useState(false)
  const [isFocusingMode, setIsFocusingMode] = useState(false)
  const [isToolsActive, setIsToolsActive] = useState(false)
  const [highlightCount, setHighlightCount] = useState(-1)
  /** 书籍内容 */
  const [content, setContent] = useState('')
  const [textCache, setTextCache] = useState(null)
  const navMap = useRef(null)
  const handleCloseSMenu = () => {
    setSMenuStatus(null)
  }

  const contentEl = useRef<HTMLDivElement>(null)
  const renderEl = useRef<HTMLDivElement>(null)
  const getNodeList = () => (
    renderEl.current
    ? Array.from(renderEl.current.children)
      .filter(node => (node as HTMLElement).getAttribute('not-content') !== 'true')
    : []
  )

  const [time, setTime] = useState(0)
  const setTimeWithThrottle = useCallback(
    throttle(() => setTime(Date.now()), 300),
    []
  )

  const mouseEventTimer = useRef(null)
  const DELAY = 3000
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

  const handleCloseReader = () => {
    handleClose(false)
    setSearchResult([])
    setKeyword('')
    setIsWaiting(false)
    ipcRenderer.send(STOP_SEARCH)
    handleToggleFullScreen(false)
    clearTimeout(mouseEventTimer.current)
    setIsToolsActive(false)
    setHighlightCount(-1)
    setTimeout(() => {
      setBookInfo(new DefaultInfo())
      setTextCache(null)
      setPageNumber(0)
      setJumpValue(1)
      setContent('')
      setRenderCount(0)
    }, 150)
  }

  const handleToggleFullScreen = (status: boolean) => {
    setIsFullScreenEnabled(status)
    ipcRenderer.send(TOGGLE_FULLSCREEN, status)
  }
  const [bookmarkCaller, setBookmarkCaller] = useState(0)
  const handleBookmark = (isRemoveEvent: boolean) => {
    const newBookInfo = new DefaultInfo()
    const { trace, detail } = bookInfo.bookmark
    const currentBookmarks = Array.isArray(detail[pageNumber])
      ? detail[pageNumber]
      : []

    if (isRemoveEvent) {
      newBookInfo.bookmark.detail[pageNumber] = currentBookmarks
        .filter(({ range }) => !range.includes(lineCount))
    } else {
      const nodeList = getNodeList()
      const computedChildren = getVisibleElements(nodeList as HTMLElement[])
        .map(([ignore, el, lineCount]) => [lineCount, el])
        .slice(-3)

      const range = Array.from(
        new Set(
          computedChildren
            .map(([lineCount, el]) => lineCount)
            .concat(clamp(lineCount, 0, nodeList.length - 1))
        )
      )
      let text = (computedChildren[computedChildren.length - 1][1] as HTMLElement)
        .innerText
        .trim()

      range.sort((a, b) => (a as number) - (b as number))
      newBookInfo.bookmark.detail[pageNumber] = [].concat(
        currentBookmarks,
        {
          range,
          text,
        }
      )
    }
    setBookInfo(bookInfo => Object.assign(
      new DefaultInfo(),
      bookInfo,
      { bookmark: {
        trace: { ...trace },
        detail: Object.assign({}, detail, newBookInfo.bookmark.detail)
      } }
    ))
    setBookmarkCaller(Date.now())
  }
  const handleEmptyBookmark = () => {
    const { trace, detail } = bookInfo.bookmark
    const totalBookmarkLength = Object.entries(detail)
      .reduce((prev, current) => (prev + current[1].length), 0)
    if (totalBookmarkLength > 0) {
      setBookInfo(bookInfo => Object.assign(
        new DefaultInfo(),
        bookInfo,
        {
          bookmark: {
            trace: { ...trace },
            detail: {}
          }
        }
      ))
      setBookmarkCaller(Date.now())
    }
  }

  const [renderCount, setRenderCount] = useState(0)
  const getTraceElement = () => {
    const computedChildren = getVisibleElements(getNodeList() as HTMLElement[])
      .map(([ignore, el, lineCount]) => [lineCount, el])
    
    const { length } = computedChildren
    const lastNode = computedChildren[length - 1]

    return Array.isArray(lastNode)
      ? lastNode
      : [0, null]
  }
  const convertTraceToLineCount = useCallback((() => {
    let timer: any
    return () => {
      clearTimeout(timer)
      setTimeout(() => {
        const [lineCount] = getTraceElement()
        setLineCount(lineCount as number)
      }, 50)
    }
  })(), [renderMode])
  const computeTotalRenderCount = () => {
    const { offsetWidth, scrollWidth } = renderEl.current

    return Math.floor(scrollWidth / (offsetWidth + 100))
  }
  const handleChangeRenderCount = (offset: number) => {
    if (renderMode === 'page') {
      const totalCount = computeTotalRenderCount()
      const computedCount = clamp(renderCount + offset, 0, totalCount)
      setRenderCount(computedCount)
      convertTraceToLineCount()
    }
  }
  const handleWheel = (e: React.WheelEvent) => {
    const { deltaY } = e
    handleChangeRenderCount(
      deltaY > 0 ? 1 : -1
    )
  }

  const eventLock = useRef(false)
  const setEventLock = (value: boolean) => {
    eventLock.current = value
  }
  const resetEventLockTimer = useRef(null)
  const handleScroll = (e: any) => {
    clearTimeout(resetEventLockTimer.current)
    resetEventLockTimer.current = setTimeout(() => {
      setEventLock(false)
    }, 320)
    if (renderMode === 'scroll' && !eventLock.current) {
      convertTraceToLineCount()
    }
  }

  const parseLineCount = (lineCount: number) => {
    const { offsetWidth } = renderEl.current
    const nodeList = getNodeList()
    const targetLine = nodeList[
      clamp(lineCount, 0, nodeList.length - 1)
    ] as HTMLElement
    if (targetLine) {
      if (renderMode === 'page') {
        switch (lineCount) {
          case 0:
            setRenderCount(0)
            break
          case Infinity:
            setRenderCount(computeTotalRenderCount())
            break
          default:
            setRenderCount(Math.floor(targetLine.offsetLeft / (offsetWidth + 100)))
        }
      } else {
        const { current } = contentEl
        const distance = parseInt(window.getComputedStyle(current)['fontSize'])

        switch (lineCount) {
          case 0:
            current.scrollTo(0, 0)
            break
          case Infinity:
            current.scrollTo(0, current.scrollHeight)
            break
          default:
            current.scrollTo(0, targetLine.offsetTop - current.offsetHeight + (distance * 2))
        }
      }
    } else if (nodeList.length === 0 && lineCount === 0) {
      setRenderCount(0)
    }
  }

  const handleToggleRenderMode = () => {
    if (renderMode === 'scroll') {
      setRenderMode('page')
    } else {
      setRenderMode('scroll')
    }
  }
  
  useEffect(() => {
    setEventLock(true)
    const timer = setTimeout(() => {
      parseLineCount(lineCount)
    }, 20)
    return () => {
      clearTimeout(timer)
    }
  }, [renderMode])

  /** 防止分页模式下元素被割裂 */
  useEffect(() => {
    const tags = [
      'rt',
      'rp',
      'rb',
      'rtc',
      'rbc',
      'ruby',
    ]
    const { current } = renderEl
    const children = Array.from(current.children)
    
    children.forEach(el => {
        const hasTag = tags.reduce((prevCount, tag) => {
          return el.getElementsByTagName(tag).length + prevCount
        }, 0) > 0
        const isInlineBlock = window.getComputedStyle(el).display === 'inline-block'
        if (hasTag || isInlineBlock) {
          el.setAttribute('style',
            hasTag ?
              '-webkit-column-break-inside: avoid;' :
              ''
          )
        }
      })

    /** 强制刷新排版 */
    const vEl = document.createElement('div')
    vEl.setAttribute('style', 'width: 0.1px; height: 0.1px; visibility: hidden; margin: 0')
    vEl.setAttribute('not-content', 'true')
    current.insertBefore(vEl, children[0])
    const timer = setTimeout(() => { current.removeChild(vEl) })
    return () => {
      clearTimeout(timer)
    }
  }, [content])

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
    const trimedKeyword = keyword.trim()
    if (trimedKeyword.length > 0) {
      setSearchResult([])
      setIsWaiting(true)
      ipcRenderer.send(START_SEARCH, { bookInfo, keyword: trimedKeyword })
    }
  }

  const navList = useRef(null)

  const handleJump = (href: string, lineCount = 0, bookInfomation?: Infomation) => {
    const { format, hash } = bookInfomation || bookInfo
    /** 当格式为TEXT并存在缓存时从缓存获取书籍内容 */
    if (format === 'TEXT' && textCache) {
      setContent(convertContent(textCache[href] as string))
      setTimeout(() => parseLineCount(lineCount))
      setLineCount(clamp(lineCount, 0, getNodeList().length - 1))
    } else {
      ipcRenderer.send(READ_BOOK, {
        lineCount,
        href,
        hash,
        format,
      })
    }
  }

  const handleChangePage = (offset: number, lineCount = 0) => {
    const { spine, manifest } = bookInfo
    offset = clamp(offset + pageNumber, 0, spine.length - 1)

    /** 处理边界情况 */
    if (offset !== pageNumber) {
      handleJump(manifest[spine[offset]].href, lineCount)
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
      let newJumpValue = clamp(jumpValue, 1, spine.length)
      setJumpValue(newJumpValue)
      /** 输入框数据未被正确更新的权宜之计 */
      jumpValueBox.current.value = newJumpValue
    }
  }
  useEffect(() => {
    setJumpValue(pageNumber + 1)
    jumpValueBox.current.blur()
  }, [pageNumber, isToolsActive])


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
    /** 强制刷新组件 */
    setTime(Date.now())
  }
  const handleClickToJump = (e: React.MouseEvent) => {
    let { target }: any = e
    let lineCount = target.getAttribute('data-line-count')

    /** 处理事件目标 */
    while (!lineCount && target.parentElement) {
      target = target.parentElement
      lineCount = target.getAttribute('data-line-count')
    }

    if (lineCount) {
      lineCount = parseInt(lineCount)
      const { spine } = bookInfo
      const href = target.getAttribute('data-href')
      const id = target.getAttribute('data-id')
      const index = spine.indexOf(id)
      const cId = spine[pageNumber]

      if (id !== cId) {
        handleJump(href, lineCount)
        setPageNumber(index)
        setJumpValue(index + 1)
      } else {
        parseLineCount(lineCount)
        setLineCount(clamp(lineCount, 0, getNodeList().length - 1))
      }
      setHighlightCount(lineCount)
      setTimeout(() => {
        window.addEventListener('click', () => setHighlightCount(-1), { once: true })
      })
      handleCloseSMenu()
    }
    /** 强制刷新组件 */
    setTime(Date.now())
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
    if (bookInfo.nav.length !== bookInfo.nav.filter(({ isSub }) => !isSub).length) {
      setIsNavShouldSquash(!isNavShouldSquash)
      if (isNavShouldSquash) {
        setTimeout(() => navList.current.scrollToItem(pageNumber, 'center'))
      } else {
        navList.current.scrollToItem(0)
      }
    }
  }
  const handleOpenNavList = () => {
    const { current } = navList
    setSMenuStatus('nav')
    setIsToolsActive(false)
    current.scrollToItem(isNavShouldSquash ? 0 : pageNumber, 'center')
  }

  /** 处理A标签跳转 */
  const handleATagClick = (e: React.MouseEvent) => {
    const { target } = e

    if ((target as HTMLElement).tagName.toUpperCase() === 'A') {
      let [href, anchor]: string[]|string[][] = (target as HTMLLinkElement).getAttribute('href')
        .split('#')

      /** 修改EPUB数据结构前的权宜之计 */
      while (href.startsWith('.')) {
        href = href.split('/')
        href = href.slice(1).join('/')
      }

      const { spine, manifest } = bookInfo
      const matched = Object.entries(manifest)
        .filter(([id, { href: iHref }]) => href === iHref)

      if (matched.length > 0) {
        const [id] = matched[0]
        const index = spine.indexOf(id)
        const cId = spine[pageNumber]
        if (id !== cId) {
          handleJump(href)
          setPageNumber(index)
          setJumpValue(index + 1)
        }
      }
      /** 强制刷新组件 */
      setTime(Date.now())
    }
    e.preventDefault()
  }

  /** 历史记录、书签保存及上传 */
  useEffect(() => {
    if (typeof library === 'object' && isReaderActive) {
      const { hash, bookmark } = bookInfo
      const { detail } = bookmark
      const newBookmark: Bookmark = {
        trace: { pageNumber, lineCount },
        detail: { ...detail }
      }

      const { data } = library
  
      data[hash] = Object.assign(new DefaultInfo(), bookInfo, { bookmark: newBookmark })
      handleChangeLibrary(Object.assign({}, library, { data }))
    }
  }, [lineCount, pageNumber, bookmarkCaller])

  /** 窗口变换事件处理 */
  const resizeTimer = useRef(null)
  const handleResize = () => {
    setEventLock(true)
    clearTimeout(resizeTimer.current)
    resizeTimer.current = setTimeout(() => {
      parseLineCount(lineCount)
      /** 强制刷新组件 */
      setTime(Date.now())
    }, 300)
  }

  useEffect(() => {
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [lineCount])

  /** 获取书籍数据并跳转到相关章节 */
  useEffect(() => {
    if (typeof library === 'object' && currentBookHash.length > 0 && isReaderActive) {
      const bookData = Object.assign(new DefaultInfo(), library.data[currentBookHash])
      setBookInfo(bookData)
      handleMouseMoveTools()
      const { bookmark, spine, manifest } = bookData
      const { pageNumber, lineCount } = bookmark.trace
      const { href } = manifest[spine[pageNumber]]

      setEventLock(true)
      handleJump(href, lineCount, bookData)
      setPageNumber(pageNumber)
      /** 强制刷新组件 */
      setTime(Date.now())
    }
    if (!isReaderActive) {
      handleCloseReader()
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
                handleChangePage(-1, Infinity)
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
                handleChangePage(-1, Infinity)
                return
              }
              current.scrollTo({ top: distance * rate })
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
            /** 重置高亮行 */
            setHighlightCount(-1)
            break
        }
      }
    }

    window.addEventListener('keyup', hotkeySupport)
    return () => {
      window.removeEventListener('keyup', hotkeySupport)
    }
  }, [isReaderActive, renderMode, pageNumber, renderCount, sMenuStatus, isFullScreenEnabled, isFocusingMode, bookInfo])

  /** 构建映射表 */
  useEffect(() => {
    navMap.current = {}
    bookInfo.nav.forEach(({ id, navLabel }) => { navMap.current[id] = navLabel })

    const loadBookListener = (event: Electron.IpcRendererEvent, {
      content, status, href, lineCount, format
    }: any) => {
      if (status === 'fail') {
        handleToast(['缓存文件已丢失，请重新导入书籍。'])
        handleCloseReader()
        return
      }
      if (format === 'TEXT') {
        setTextCache(content)
        content = convertContent(content[href] as string)
      }
      setContent(content)
      setTimeout(() => {
        parseLineCount(lineCount)
        /** 强制刷新组件 */
        setTime(Date.now())
      })
      setLineCount(clamp(lineCount, 0, getNodeList().length - 1))
    }
    ipcRenderer.on(LOAD_BOOK, loadBookListener)

    return () => {
      ipcRenderer.off(LOAD_BOOK, loadBookListener)
    }
  }, [bookInfo, renderMode])

  /** 响应样式变更 */
  const [contentStyle, setContentStyle] = useState({})
  const [styleCSS, setStyleCSS] = useState({
    color: '',
    backgroundColor: '',
    cursor: '',
  })
  const handleChangeColorStyle = () => {
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
      backgroundColor: bgColor
    }))
    setStyleCSS(CSS => Object.assign({}, CSS, { color, backgroundColor: bgColor }))
  }
  useEffect(() => {
    const timer = setTimeout(handleChangeColorStyle, 200)
    return () => clearTimeout(timer)
  }, [
    textColor, backgroundColor, cColorPlan
  ])

  const handleResetCustomPlan = () => {
    setTextColor(customPlan[0])
    setBackgroundColor(customPlan[1])
  }

  useEffect(() => {
    setStyleCSS(CSS => Object.assign({}, CSS, { cursor: isToolsActive || sMenuStatus !== null ? 'auto' : 'none' }))
  }, [isToolsActive, sMenuStatus])

  const [ColorCSSText, setColorCSSText] = useState('')
  useEffect(() => {
    const { color, backgroundColor, cursor } = styleCSS
    const complementaryColor = getComplementaryColor(backgroundColor)
    let colorCSSText = `
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
    .reader-content > div > *:nth-child(${highlightCount + 1}) {
      background-color: ${complementaryColor} !important;
      color: ${backgroundColor} !important;
    }
    `
    setColorCSSText(colorCSSText)
  }, [styleCSS, highlightCount])

  const [fontCSSText, setFontCSSText] = useState('')
  const handleChangeFontStyle = () => {
    const CSSText = `
    .reader-content > div > * {
      margin-bottom: ${lineHeight}px;
      text-indent: ${textIndent * fontSize}px;
    }
    `
    setContentStyle(style => Object.assign({}, style, {
      fontFamily,
      fontSize: fontSize + 'px',
    }))
    setFontCSSText(CSSText)
    parseLineCount(lineCount)
  }
  useEffect(() => {
    setEventLock(true)
    const timer = setTimeout(handleChangeFontStyle, 300)
    return () => {
      clearTimeout(timer)
    }
  }, [fontFamily, fontSize, lineHeight, textIndent])

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
      setIsWaiting(false)
      setSearchResult(result)
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
      <style dangerouslySetInnerHTML={{ __html: ColorCSSText }}></style>
      <style dangerouslySetInnerHTML={{ __html: fontCSSText }}></style>
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
        {
          (() => {
            if (bookInfo.hash !== '' && renderMode === 'page') {
              const totalRenderCount = computeTotalRenderCount()
              let total = (totalRenderCount + 1).toString()
              let current = (renderCount + 1).toString()
              let width = Math.floor(renderCount / totalRenderCount * 100)
              width = isNaN(width) ? 100 : width

              return (
                <>
                  <div
                    style={{
                      position: 'fixed',
                      left: 0,
                      bottom: 0,
                      width: width + '%',
                      height: '6px',
                      backgroundColor: styleCSS.color,
                      transition: 'width .15s ease-in-out, background .3s ease',
                    }}
                  ></div>
                  <p
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
                  </p>
                </>
              )
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
          dangerouslySetInnerHTML={{ __html: content }}
          onClick={ handleATagClick }
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
        <i className="reader-tool common-active ri-arrow-left-line" onClick={ () => handleClose(false) }>
          <span className="reader-tool-tips">返回</span>
        </i>
        {
          bookInfo.bookmark.detail[pageNumber] &&
          bookInfo.bookmark.detail[pageNumber].some(
            ({ range }) => Array.isArray(range) && range.includes(lineCount)
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
              onInput={(e: any) => setKeyword((e.target as HTMLInputElement).value)}
              value={ keyword }
            />
          </div>
          <div
            style={{ display: isWaiting ? '' : 'none' }}
            className="s-m-s-loading"
          >
            <div className="s-m-s-loading-slider"></div>
          </div>
          {
            searchResult.length > 0
            ? (
              <span
                style={{
                  position: 'absolute',
                  right: '20px',
                  top: '48px',
                  fontSize: '14px',
                  color: '#b9b9b9',
                }}
              >
                找到约 {searchResult.length.toLocaleString()} 条结果
              </span>
            )
            : null
          }
          <div className="s-m-search-result" onClick={ handleClickToJump }>
            <FixedSizeList
              width={ 500 }
              height={ 220 }
              itemCount={ searchResult.length }
              itemSize={ 95 }
            >
              {
                ({index, style}) => {
                  const {id, text, lineCount, pageNumber} = searchResult[index]
                  const { href } = bookInfo.manifest[id]
                  const navLabel = typeof navMap.current[id] === 'string'
                    ? decodeHTMLEntities(navMap.current[id])
                    : `章节 ${pageNumber + 1}`
                  return (
                    <div
                      style={ style }
                      data-id={ id }
                      data-href={ href }
                      data-line-count={ lineCount }
                      key={ index }
                      className="s-m-search-result-item common-active"
                    >
                      <p className="s-m-search-result-title">{ navLabel }</p>
                      <p className="s-m-search-result-text" dangerouslySetInnerHTML={{ __html: text }}></p>
                      <span className="s-m-search-result-count">{ lineCount + 1 }</span>
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
          onClick={ handleClickToJump }
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
              Object.entries(bookInfo.bookmark.detail).map(([keyName, bookmarks]) => {
                const pageNumber = parseInt(keyName)

                const id = bookInfo.spine[pageNumber]
                const { href } = bookInfo.manifest[id]
                const navLabel = typeof navMap.current[id] === 'string'
                  ? navMap.current[id]
                  : `章节 ${ pageNumber + 1 }`
                const decodedNavLabel = decodeHTMLEntities(navLabel)
                return bookmarks.map(({ text, range }) => {
                  const lineCount = range.slice(-1)[0]
                  return (
                    <div
                      data-href={ href }
                      data-line-count={ lineCount }
                      data-range={ range }
                      data-id={ id }
                      className="common-active reader-bookmark flex-box"
                      key={ `${pageNumber}-${lineCount}` }
                    >
                      <span className="reader-bookmark-title">{ decodedNavLabel }</span>
                      <p className="reader-bookmark-text">
                        { text }
                      </p>
                      <span className="reader-bookmark-count">{ lineCount + 1 }</span>
                    </div>
                  )
                })
              })
            }
          </div>
        </div>
        <div className="reader-nav-tools flex-box">
          {
            navMenuStatus
            ? (
              <span
                className={
                  classNames(
                    'reader-tool common-active',
                    { 'reader-tool-disabled': bookInfo.nav.length === bookInfo.nav.filter(({ isSub }) => !isSub).length }
                  )
                }
                onClick={handleToggleNavSquashable}
              >
                { isNavShouldSquash ? '展开目录' : '折叠目录' }
              </span>
            )
            : (
              <span
                className={
                  classNames(
                    'reader-tool common-active',
                    { 'reader-tool-disabled': 
                      Object.entries(bookInfo.bookmark.detail)
                        .reduce((prev, current) => (prev + current[1].length), 0) === 0
                    }
                  )
                }
                onClick={handleEmptyBookmark}
              >
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