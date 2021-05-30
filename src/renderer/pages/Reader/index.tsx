import React, { useState, useEffect, useRef } from 'react'
import { FixedSizeList  } from 'react-window'
import { HexColorPicker } from 'react-colorful'
import AutoSizer from "react-virtualized-auto-sizer"
import Slider from 'react-slider'
import { classNames } from '@utils/classNames'
import { debounce } from '@utils/debounce'
import { LOAD_BOOK, READ_BOOK, SEARCH_RESULT, START_SEARCH } from '@constants'

import Flipping from './Flipping'

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
      backgroundColor: background
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

const colorPlan = [
  ['#000000', '#ffffff'],
  ['#393939', '#efebdf'],
  ['#393939', '#e7d7bd'],
  ['#393939', '#deebcf'],
  ['#282828', '#a4a6a3'],
  ['#9c9a9d', '#000000'],
  ['#adadb5', '#29354b'],
  ['#324553', '#080b10'],
]

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
}: Props): JSX.Element {
  /** 样式属性 */
  const [renderMode, setRenderMode] = useState('page') /** 可选值：page/scroll */

  const [fontFamily, setFontFamily] = useState('微软雅黑')
  const [fontSize, setFontSize] = useState(18)
  const [textIndent, setTextIndent] = useState(0)
  const [lineHeight, setLineHeight] = useState(50)

  const [cColorPlan, setCColorPlan] = useState(0)
  const [textColor, setTextColor] = useState('#b7a1ff')
  const [backgroundColor, setBackgroundColor] = useState('#2e003e')
  /** 状态属性 */
  const [sMenuStatus, setSMenuStatus] = useState(null) /** 可选值：null/nav/font/color/search */
  const [bookInfo, setBookInfo] = useState<Infomation>(Object.assign({}, defaultInfo))
  const [pageNumber, setPageNumber] = useState(0)
  const [navMenuStatus, setNavMenuStatus] = useState(true)
  const [isWaiting, setIsWaiting] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [searchResult, setSearchResult] = useState([])
  /** 书籍内容 */
  const [content, setContent] = useState('')
  const [textCache, setTextCache] = useState(null)
  const navMap = useRef(null)
  const handleCloseSMenu = () => {
    setSMenuStatus(null)
  }

  const handleCloseReader = () => {
    handleClose(false)
    setBookInfo(Object.assign({}, defaultInfo))
    setTextCache(null)
    setPageNumber(0)
    setContent('')
    setSearchResult([])
    /** to-do: 取消全屏 */
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

  const contentEl = useRef<HTMLDivElement>(null)
  const renderEl = useRef<HTMLDivElement>(null)
  const handleRestScroll = () => {
    contentEl.current.scrollTo(0, 0)
  }
  const [renderCount, setRenderCount] = useState(0)
  const [progress, setProgress] = useState(0)
  const computTotalRenderCount = () => {
    const { current } = renderEl
    const { offsetWidth } = contentEl.current
    const { scrollWidth } = current

    return Math.ceil((scrollWidth - offsetWidth) / (offsetWidth + 60))
  }
  const handleWheel = (e: React.WheelEvent) => {
    const { deltaY } = e
    if (renderMode === 'page') {
      const totalCount = computTotalRenderCount()
      const computedCount = Math.max(
        0,
        Math.min(
          deltaY > 0
            ? renderCount + 1
            : renderCount - 1,
          totalCount
        )
      )
      setRenderCount(computedCount)
      setProgress(computedCount / totalCount)
    }
  }
  const handleScroll = () => {
    if (renderMode === 'scroll') {
      const { current } = contentEl
      const { scrollHeight, scrollTop, offsetHeight } = current
      const computedHeight = scrollHeight - offsetHeight
  
      setProgress(scrollTop / computedHeight)
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
  }
  const handleResize = () => {
    if (renderMode === 'page') {
      setRenderCount(Math.floor(progress * computTotalRenderCount()))
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
    if (keyword.length > 0) {
      setSearchResult([])
      setIsWaiting(true)
      ipcRenderer.send(START_SEARCH, { bookInfo, keyword })
    }
  }

  const navList = useRef(null)
  const handleOpenNavList = () => {
    const { current } = navList
    setSMenuStatus('nav')
    current.scrollToItem(pageNumber)
  }

  const handleJump = (href: string, progress = 0) => {
    const { format, hash } = bookInfo
    /** 当格式未TEXT并存在缓存时从缓存获取书籍内容 */
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

  const handleChangePage = (offset: number) => {
    const { spine, manifest } = bookInfo
    offset = Math.min(
      spine.length - 1,
      Math.max(0, offset + pageNumber)
    )

    /** 处理边界情况 */
    if (offset !== pageNumber) {
      handleJump(manifest[spine[offset]].href)
      setPageNumber(offset)
    }
  }

  const parseProg = (prog: number) => {
    if (renderMode === 'page') {
      setRenderCount(Math.ceil(prog * computTotalRenderCount()))
    } else {
      const { scrollHeight, offsetHeight } = contentEl.current
      const computedHeight = scrollHeight - offsetHeight
      contentEl.current.scrollTo({ left: 0, top: computedHeight * prog })
    }
    setProgress(prog)
  }

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
        handleCloseSMenu()
        setPageNumber(index)
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
      } else {
        parseProg(prog)
      }
      handleCloseSMenu()
    }
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

  useEffect(() => {
    /** 构建映射表 */
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
      new Promise((res, rej) => {
        setContent(content)
        setTimeout(res, 100)
      })
        .then(res => {
          parseProg(progress)
        })
    }
    ipcRenderer.on(LOAD_BOOK, loadBookListener)

    return () => {
      ipcRenderer.off(LOAD_BOOK, loadBookListener)
    }
  }, [bookInfo])

  /** 相应样式变更 */
  const [contentStyle, setContentStyle] = useState({})
  const handleChangeStyle = debounce(() => {
    const multiple = fontSize / 18
    const computedTextIndent = textIndent / 10 / multiple
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
      textIndent: computedTextIndent + 'em',
      lineHeight: 150 + lineHeight + '%',
      backgroundColor: bgColor
    }))
  }, 150)
  useEffect(handleChangeStyle, [
    fontFamily, fontSize, textIndent, lineHeight, textColor, backgroundColor, cColorPlan
  ])

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
            backgroundColor: '#72047f',
            transition: 'width 0.3s ease 0s',
          }}
        ></div>
        <div
          dangerouslySetInnerHTML={{
            __html: content
              .split(/[\r\n]+/)
              .map(str => `<p>${str}</p>`)
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
      <div className="flex-box reader-toolbar">
        <div
          className={
            classNames(
              'flex-box reader-tools',
              { 'reader-tools-focus': sMenuStatus !== null && sMenuStatus !== 'nav' }
            )
          }
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
          <span className="reader-tool flex-box reader-pnum">
            <Flipping value={ pageNumber + 1 }/>
            <span className="reader-tool-tips">
              {
                Math.floor((pageNumber + 1) / bookInfo.spine.length * 100) === 0
                ? '1%'
                : Math.floor((pageNumber + 1) / bookInfo.spine.length * 100) + '%'
              }
            </span>
          </span>
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
          <i className="reader-tool common-active ri-fullscreen-line">
            <span className="reader-tool-tips">全屏模式</span>
          </i>
        </div>
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
                step={0.38}
                defaultValue={ fontSize }
                onChange={ (val: number) => setFontSize(val) }
              />
            </div>
            <div className="flex-box s-m-row">
              <p className="s-m-title">首行缩进</p>
              <CustomSlider
                max={100}
                defaultValue={ textIndent }
                onChange={ (val: number) => setTextIndent(val) }
              />
            </div>
            <div className="flex-box s-m-row">
              <p className="s-m-title">行距</p>
              <CustomSlider
                max={100}
                defaultValue={ lineHeight }
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
                <p className="s-m-title">自定义方案</p>
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
              <i className="ri-search-line"></i>
            </button>
            <input
              type="text"
              className="s-m-input"
              spellCheck="false"
              onInput={(e) => setKeyword((e.target as HTMLInputElement).value.trim())}
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
            {
              searchResult.map((res, index) => {
                const { result, id } = res
                const navLabel = navMap.current[id]
                const { href } = bookInfo.manifest[id]

                return (
                  <>
                  {
                    result.map((resMap: any[], i: number) => {
                      const [str, prog] = resMap
                      return (
                        <div
                          data-id={ id }
                          data-href={ href }
                          data-prog={ prog }
                          key={`${index}-${i}`}
                          className="s-m-search-result-item common-active"
                        >
                          <p className="s-m-search-result-title">{ typeof navLabel === 'string' ? navLabel : href }</p>
                          <p className="s-m-search-result-text">{ str }</p>
                          <span className="s-m-search-result-prog">{ Math.floor(prog * 100) }</span>
                        </div>
                      )
                    })
                  }
                  </>
                )
              })
            }
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
              ({ width, height }) => (
                <FixedSizeList
                  width={ width }
                  height={ height }
                  itemCount={ bookInfo.nav.length }
                  itemSize={ 55 }
                  ref={ navList }
                >
                  {
                    ({index, style}) => {
                      const { id, navLabel, href, isSub } = bookInfo.nav[index]
                      const pIndex = bookInfo.spine.indexOf(id)
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
                          title={ navLabel }
                        >
                          <p>{ navLabel }</p>
                        </div>
                      )
                    }
                  }
                </FixedSizeList>
              )
            }
          </AutoSizer>
        </div>
        <div
          style={{
            position: 'absolute',
            top: '60px',
            left: 0,
            width: '100%',
            height: 'calc(100% - 80px)',
            overflowY: 'auto',
            transform: !navMenuStatus
              ? 'translate3d(0, 0, 0)'
              : 'translate3d(100%, 0, 0)',
            transition: 'transform .2s ease-out'
          }}
          onClick={ handleClickBookmark }
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
                  : href
                return (
                  <p
                    data-href={ href }
                    data-prog={ progress }
                    data-id={ id }
                    className="common-active reader-bookmark"
                    key={ index }
                    title={ navLabel }
                  >
                    { navLabel }
                    <span className="reader-bookmark-prog">{ Math.floor(progress * 100) + '%' }</span>
                  </p>
                )
              })
            }
          </div>
        </div>
      </div>
    </div>
  )
}