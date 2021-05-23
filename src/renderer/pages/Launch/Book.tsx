import React, { useState, useEffect } from 'react'

/** C 代表 concise */
interface CInfomation {
  title: string /** 书籍标题 */
  format: 'EPUB' | 'TEXT' /** 书籍格式 */
  cover: string | false /** 书籍路径 */
  progress: number
}

const placeholder = require('@static/illustration/undraw_void_3ggu.svg').default

export default function Book ({ cover, title, format, progress }: CInfomation): JSX.Element {

  return (
    <div className="book-wrapper common-active" title={title}>
      <div className="flex-box book-cover">
        {
          cover
            ? (<img src="" draggable="false"/>)
            : (<img src={ placeholder } width="80" draggable="false"/>)
        }
      </div>
      <p className="common-ellipsis book-title">{ title }</p>
      <p className="book-description">{ format }</p>
      <p className="book-progress">{ progress }</p>
    </div>
  )
}