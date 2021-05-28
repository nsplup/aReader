import React, { useState, useEffect, useRef } from 'react'
import { FixedSizeList  } from 'react-window'
import { HexColorPicker } from 'react-colorful'
import AutoSizer from "react-virtualized-auto-sizer"
import Slider from 'react-slider'
import { classNames } from '@utils/classNames'
import { LOAD_BOOK, READ_BOOK } from '@constants'

import Flipping from './Flipping'

const searchPlaceholder = require('@static/illustration/undraw_Web_search_re_efla.svg').default

const CustomSlider = (props: any) => (
  <Slider
    { ...props }
    className="com-slider"
    thumbClassName="com-slider-thumb"
    trackClassName="com-slider-track"
    renderThumb={(props, state) => (
      <div { ...props }>
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

interface Props {
  fonts: Array<string>
  isReaderActive: boolean
  handleClose: Function
  userconfig: UserConfig
  currentBookHash: string
  library: Library
  ipcRenderer: Electron.IpcRenderer
}

export default function Reader ({
  fonts,
  isReaderActive,
  handleClose,
  userconfig,
  currentBookHash,
  library,
  ipcRenderer,
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
  const [bookInfo, setBookInfo] = useState<Infomation>({
    title: '',
    cover: null,
    format: 'EPUB',
    hash: '',
    nav: [],
    manifest: {},
    createdTime: 0,
    spine: [],
    bookmark: { default: [], detail: [] }
  })
  const [pageNumber, setPageNumber] = useState(0)
  /** 书籍内容 */
  const [content, setContent] = useState('')
  const [textCache, setTextCache] = useState(null)
  const handleCloseSMenu = () => {
    setSMenuStatus(null)
  }

  const handleCloseReader = () => {
    handleClose(false)
    /** to-do: 取消全屏 */
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

    return Math.ceil((scrollWidth - offsetWidth) / offsetWidth)
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

  const navList = useRef(null)
  const handleOpenNavList = () => {
    const { current } = navList
    setSMenuStatus('nav')
    current.scrollToItem(pageNumber, 'center')
  }

  const handleJump = (href: string) => {
    const { hash, format } = bookInfo
    /** 当格式未TEXT并存在缓存时从缓存获取书籍内容 */
    if (format === 'TEXT' && textCache) {
      setContent(textCache[href])
      /** 重置页面进度 */
      handleRestScroll()
      setRenderCount(0)
    } else {
      ipcRenderer.send(READ_BOOK, {
        hash,
        href,
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

  useEffect(() => {
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [progress])

  useEffect(() => {
    if (currentBookHash && typeof currentBookHash === 'string') {
      const book = library.categories[0].books.filter(({ hash }) => hash === currentBookHash)[0]
      setBookInfo(book)
      setTextCache(null)
      const { spine, manifest, format } = book
    
      ipcRenderer.send(READ_BOOK, {
        hash: currentBookHash,
        href: manifest[spine[0]].href,
        format,
      })
    } else {
      isReaderActive && handleCloseReader()
    }
    /** 重置页面进度 */
    handleRestScroll()
    setRenderCount(0)
  }, [currentBookHash])

  useEffect(() => {
    const loadBookListener = (event: Electron.IpcRendererEvent, content: any) => {
      if (bookInfo.format === 'TEXT') {
        setTextCache(content)
        content = content[bookInfo.manifest[bookInfo.spine[0]].href]
      }
      setContent(content)
      /** 重置页面进度 */
      handleRestScroll()
      setRenderCount(0)
    }
    ipcRenderer.on(LOAD_BOOK, loadBookListener)

    return () => {
      ipcRenderer.off(LOAD_BOOK, loadBookListener)
    }
  }, [bookInfo])

  useEffect(() => {
    const { current } = contentEl
    const handleClickProxy = (e: MouseEvent) => {
      e.stopPropagation()
      e.preventDefault()
    }

    current.addEventListener('click', handleClickProxy, { passive: false })

    return () => {
      current.removeEventListener('click', handleClickProxy)
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
      >
        <div
          dangerouslySetInnerHTML={{ __html: content }}
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
          <i className="reader-tool common-active ri-bookmark-line">
            <span className="reader-tool-tips">插入书签</span>
          </i>
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
          <span className="flex-box reader-pnum">
            <Flipping value={ pageNumber + 1 }/>
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
        >
          <div className="flex-box s-m-font-style">
            <div className="flex-box s-m-row">
              <p className="s-m-title">字体大小</p>
              <CustomSlider min={12} max={50} step={0.38} defaultValue={fontSize}/>
            </div>
            <div className="flex-box s-m-row">
              <p className="s-m-title">首行缩进</p>
              <CustomSlider max={100} defaultValue={textIndent}/>
            </div>
            <div className="flex-box s-m-row">
              <p className="s-m-title">行距</p>
              <CustomSlider max={100} defaultValue={lineHeight}/>
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
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: '25px',
              margin: 'auto',
            }}
          />
          <div style={{ position: 'relative' }}>
            <button className="flex-box s-m-search-btn">
              <i className="ri-search-line"></i>
            </button>
            <input type="text" className="s-m-input" spellCheck="false"/>
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
    </div>
  )
}