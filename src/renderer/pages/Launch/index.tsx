import React, { useState, useEffect, useRef } from 'react'
import { connect } from 'react-redux'
import { ipcRenderer } from 'electron'

import {
  OPEN_DIALOG,
  FONTS_READY,
  WINDOW_READY,
  LOAD_LIBRARY,
  LOAD_USERCONFIG,
  START_IMPORT,
  DELETE_BOOK,
} from '@constants'

import Book from './Book'
import Reader from '../Reader'
import Placeholder from './Placeholder'
import Toast from './Toast'
import {
  generateFonts,
  updateLibrary,
  updateUserConfig,
} from '@renderer/actions'
import { classNames } from '@utils/classNames'
import { toCSSText } from '@utils/toCSSText'

const illustration = require('@static/illustration/undraw_book_lover_mkck.svg').default
const logo = require('@static/aReader_icon.png').default

interface Props {
  fonts: Array<string>
  library: Library
  userconfig: UserConfig
  generateFonts: (fonts: Array<string>) => any
  updateLibrary: (library: Library) => any
  updateUserConfig: (userconfig: UserConfig) => any
}


function Launch ({
  fonts,
  library,
  userconfig,
  generateFonts,
  updateLibrary,
  updateUserConfig,
}: Props): JSX.Element {
  /** 打开文件选择器事件 */
  const handleOpenDialog = () => ipcRenderer.send(OPEN_DIALOG)

  /** Cmenu === Contextmenu */
  const [isCMenuActive, setIsCMenuActive] = useState(false)
  const cMenu = useRef<HTMLDivElement>()

  /** Toast组件变量 */
  const [message, setMessage] = useState(['', ''])

  /** Reader组件变量 */
  const [isReaderActive, setIsReaderActive] = useState(false)
  const [currentBook, setCurrentBook] = useState('')
  
  /** 激活阅读窗口事件 */
  const handleEnableReader = (e: MouseEvent) => {
    const { path } = e as any
    const book = [...path].filter((el: Element) => el.className && el.className.includes('book-wrapper'))[0]

    if (!isReaderActive && book) {
      const bookHash = book.getAttribute('data-hash')
      setCurrentBook(bookHash)
      setIsReaderActive(true)
    }
  }

  /** 关闭右键菜单事件 */
  const hashCache = useRef('')
  const handleCloseCMenu = () => {
    const { current: cMenuEl } = cMenu
    setIsCMenuActive(false)
    hashCache.current = ''
        
    cMenuEl.style.cssText = toCSSText({
      left: 0,
      top: 0,
    })
  }
  const handleDelete = () => {
    const hash = hashCache.current
    let { shelf } = library

    shelf = shelf.filter(n => n !== hash)

    updateLibrary(Object.assign({}, library, { shelf }))
    handleCloseCMenu()
    ipcRenderer.send(DELETE_BOOK, hash)
  }

  /** 正在导入的书籍数量 */
  const [taskCount, setTaskCount] = useState(0)
  const startImportListener = (event: Electron.IpcRendererEvent, taskCount: number) => {
    setTaskCount(oldCount => oldCount + taskCount)
  }
  useEffect(() => {
    /** 主线程请求字体列表事件 */
    const fontsListener = (event: Electron.IpcRendererEvent, fonts: Array<string>) => {
      generateFonts(fonts)
    }
    /** 主线程请求书架数据事件 */
    const libraryListener = (event: Electron.IpcRendererEvent, library: Library) => {
      updateLibrary(library)
    }
    /** 主线程请求用户数据事件 */
    const userconfigListener = (event: Electron.IpcRendererEvent, userconfig: UserConfig) => {
      updateUserConfig(userconfig)
    }
    ipcRenderer.on(FONTS_READY, fontsListener)
    ipcRenderer.on(LOAD_LIBRARY, libraryListener)
    ipcRenderer.on(LOAD_USERCONFIG, userconfigListener)
    ipcRenderer.on(START_IMPORT, startImportListener)
    ipcRenderer.send(WINDOW_READY)

    /** 右键菜单事件 */
    const handleContextmenu = (e: MouseEvent) => {
      const { path, pageX, pageY } = e as any
      const book = [...path].filter((el: Element) => el.className && el.className.includes('book-wrapper'))[0]

      if (!isReaderActive && book) {
        const bookHash = book.getAttribute('data-hash')
        const { current: cMenuEl } = cMenu
        setIsCMenuActive(true)
        hashCache.current= bookHash
        
        cMenuEl.style.cssText = toCSSText({
          left: pageX,
          top: pageY
        })
      }
    }

    document.body.addEventListener('contextmenu', handleContextmenu)
    document.body.addEventListener('click', handleEnableReader)

    return () => {
      ipcRenderer.off(FONTS_READY, fontsListener)
      ipcRenderer.off(LOAD_LIBRARY, libraryListener)
      ipcRenderer.off(LOAD_USERCONFIG, userconfigListener)
      ipcRenderer.off(START_IMPORT, startImportListener)
      document.body.removeEventListener('contextmenu', handleContextmenu)
      document.body.removeEventListener('click', handleEnableReader)
    }
  }, [])

  useEffect(() => {
    document.body.style.overflow = isReaderActive ? 'hidden' : ''
  }, [isReaderActive])

  return (
    <>
      <div
        className="flex-box launch-wrapper"
        style={{
          userSelect: "none"
        }}
      >
        <button className="flex-box common-button common-active" onClick={ handleOpenDialog }>
          <i className="ri-file-add-line"></i>
          导入书籍
        </button>
        {/* <section
          className="launch-library"
          style={{
            display: library && library.history.length > 0 ? '' : 'none'
          }}
        >
          <header className="launch-title">最近阅读</header>
          <div className="launch-content fix">

          </div>
        </section> */}
        <section
          className="launch-library"
          style={{
            display: taskCount > 0 || (library && library.shelf.length > 0) ? '' : 'none'
          }}
        >
          <header className="launch-title">书架</header>
          <div className="launch-content fix">
            {
              Array.from(Array(taskCount), (_, i) => (<Placeholder key={ i } />))
            }
            {
              library && library.shelf.map((sha256, index) => {
                const { hash, title, cover, format, bookmark, spine } = library.data[sha256]
                const { history } = Object.assign({ history: [] }, bookmark)
                const prog = history.length === 2
                  ? Math.floor((history[0] + 1) / spine.length * 100)
                  : 0

                return (<Book
                  hash={ hash }
                  title={ title }
                  cover={ cover }
                  format={ format }
                  progress={ prog }
                  key={ index }
                />)
              })
            }
          </div>
        </section>
        {/* 最近阅读和书架均为空时显示 */}
        <div
          className="flex-box"
          style={{
            display: taskCount > 0 
              || (library && library.shelf.length > 0)
                ? 'none'
                : '',
            position: 'absolute',
            bottom: '80px',
            width: '100%',
            flexDirection: 'column',
          }}
        >
          <img src={ illustration } width="400" draggable="false"/>
          <p className="common-description">书图镜览，辞章讨论。</p>
        </div>
        {/* 底部 Logo */}
        <div
          className="flex-box"
          style={{
            justifyContent: 'flex-end',
            alignItems: 'flex-end',
            position: 'absolute',
            bottom: '0',
            width: '100%',
            padding: '20px',
            boxSizing: 'border-box',
          }}
          >
          <div className="flex-box" style={{ height: '40px' }}>
            <img src={ logo } width="40" draggable="false"/>
            <p className="launch-title" style={{ marginLeft: '5px' }}>镜览</p>
          </div>
        </div>
      </div>
      <Reader
        fonts={ fonts }
        isReaderActive={ isReaderActive }
        handleClose={ setIsReaderActive }
        userconfig={ userconfig }
        currentBookHash={ currentBook }
        library={ library }
        ipcRenderer={ ipcRenderer }
        handleToast={ setMessage }
        handleChangeLibrary={ updateLibrary }
      />
      <div
        className="common-mask"
        style={{
          position: isCMenuActive ? 'fixed' : 'absolute',
          visibility: isCMenuActive ? 'visible' : 'hidden'
        }}
        onClick={handleCloseCMenu}
      ></div>
      <div
        ref={ cMenu }
        className={
          classNames(
            "flex-box com-contextmenu",
            isCMenuActive ? 'com-c-active' : ''
          )
        }
      >
        {/* <div className="flex-box com-c-item common-active">
          <i className="ri-heart-line"></i>
          <p className="com-c-title">加入书架</p>
        </div> */}
        <div className="flex-box com-c-item common-active" onClick={ handleDelete }>
          <i className="ri-delete-bin-line"></i>
          <p className="com-c-title">删除书籍</p>
        </div>
      </div>
      <Toast msg={ message[0] } detail={ message[1] } handleReset={ setMessage } />
    </>
  )
}

const mapStateToProps = ({ fonts, library, userconfig }: any) => ({ fonts, library, userconfig })
const mapDispatchToProps = (dispatch: any) => ({
  generateFonts: (fonts: Array<string>) => dispatch(generateFonts(fonts)),
  updateLibrary: (library: Library) => dispatch(updateLibrary(library)),
  updateUserConfig: (userconfig: UserConfig) => dispatch(updateUserConfig(userconfig))
})
const connectedLaunch = connect(mapStateToProps, mapDispatchToProps)(Launch)

export default connectedLaunch