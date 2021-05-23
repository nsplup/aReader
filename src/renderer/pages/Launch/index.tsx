import React, { useState, useEffect, useRef } from 'react'
import { connect } from 'react-redux'
import { ipcRenderer } from 'electron'

import {
  OPEN_DIALOG,
  FONTS_READY,
} from '@constants'

import Book from './Book'
import Reader from '../Reader'
import { generateFonts } from '@renderer/actions'
import { WINDOW_READY } from '@constants'
import { classNames } from '@utils/classNames'
import { toCSSText } from '@utils/toCSSText'

const illustration = require('@static/illustration/undraw_book_lover_mkck.svg').default
const logo = require('@static/aReader_icon.png').default

interface Props {
  fonts: Array<string>
  generateFonts: (fonts: Array<string>) => any
}


function Launch ({
  fonts,
  generateFonts,
}: Props): JSX.Element {
  /** 打开文件选择器事件 */
  const handleOpenDialog = () => ipcRenderer.send(OPEN_DIALOG)

  /** Cmenu === Contextmenu */
  const [isCMenuActive, setIsCMenuActive] = useState(false)
  const cMenu = useRef<HTMLDivElement>()

  useEffect(() => {
    /** 主进程通信事件 */
    const listener = (event: Electron.IpcRendererEvent, fonts: Array<string>) => {
      generateFonts(fonts)
    }
    ipcRenderer.once(FONTS_READY, listener)
    ipcRenderer.send(WINDOW_READY)

    /** 右键菜单事件 */
    const handleContextmenu = (e: MouseEvent) => {
      const { path, pageX, pageY, target } = e as any

      if ([...path].some((el: Element) => el.className && el.className.includes('book-wrapper'))) {
        setIsCMenuActive(true)
        const { current: cMenuEl } = cMenu
        
        cMenuEl.style.cssText = toCSSText({
          left: pageX,
          top: pageY
        })
      }
    }

    document.body.addEventListener('contextmenu', handleContextmenu)

    return () => {
      // ipcRenderer.off(FONTS_READY, listener)
      document.body.removeEventListener('contextmenu', handleContextmenu)
    }
  }, [])

  return (
    <>
      <div className="flex-box launch-wrapper" style={{ userSelect: "none" }}>
        <button className="flex-box common-button common-active" onClick={ handleOpenDialog }>
          <i className="ri-file-add-line"></i>
          导入书籍
        </button>
        <section className="launch-library">
          <header className="launch-title">最近阅读</header>
          <div className="launch-history fix">
            {
              [...new Array(10).keys()].map(() => (
                <Book cover={ false } title="异世界转生，地雷！异世界转生，地雷！" format="EPUB" progress={ 50 } />
              ))
            }
          </div>
        </section>
        <section className="launch-library">
          <header className="launch-title">书架</header>
        </section>
        {/* 最近阅读和书架均为空时显示 */}
        <div className="flex-box" style={{ width: '100%', flexDirection: 'column' }}>
          <img src={ illustration } width="400" draggable="false"/>
          <p className="common-description">书图镜览，辞章讨论。</p>
        </div>
        {/* 底部 Logo */}
        <div
          className="flex-box"
          style={{
            justifyContent: 'flex-end',
            alignItems: 'flex-end',
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
      <Reader fonts={ fonts }/>
      <div
        className="common-mask"
        style={{
          visibility: isCMenuActive ? 'visible' : 'hidden'
        }}
        onClick={() => setIsCMenuActive(false)}
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
        <div className="flex-box com-c-item common-active">
          <i className="ri-heart-line"></i>
          <p className="com-c-title">加入书架</p>
        </div>
        <div className="flex-box com-c-item common-active">
          <i className="ri-delete-bin-line"></i>
          <p className="com-c-title">删除书籍</p>
        </div>
      </div>
    </>
  )
}

const mapStateToProps = ({ fonts }: any) => ({ fonts })
const mapDispatchToProps = (dispatch: any) => ({
  generateFonts: (fonts: Array<string>) => dispatch(generateFonts(fonts))
})
const connectedLaunch = connect(mapStateToProps, mapDispatchToProps)(Launch)

export default connectedLaunch