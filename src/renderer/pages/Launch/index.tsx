import React, { useState, useEffect } from 'react'
import { ipcRenderer } from 'electron'

import { OPEN_DIALOG } from '@constants'

const illustration = require('@static/illustration/undraw_book_lover_mkck.svg').default
const logo = require('@static/aReader_icon.png').default


export default function Launch (): JSX.Element {
  const handleOpenDialog = () => ipcRenderer.send(OPEN_DIALOG)

  return (
    <div className="flex-box launch-wrapper" style={{ userSelect: "none" }}>
      <button className="flex-box common-button" onClick={ handleOpenDialog }>
        <i className="ri-file-add-line"></i>
        导入书籍
      </button>
      <section className="launch-library">
        <header className="launch-title">最近阅读</header>
      </section>
      <section className="launch-library">
        <header className="launch-title">书架</header>
      </section>
      {/* 最近阅读和书架均为空时显示 */}
      <div className="flex-box" style={{ width: '100%', flexDirection: 'column' }}>
        <img src={ illustration } width="400" draggable="false"/>
        <p className="common-description">书图镜览，辞章讨论。</p>
      </div>
      <div
        className="flex-box"
        style={{
          justifyContent: 'flex-start',
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
  )
}