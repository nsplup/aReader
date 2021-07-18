import React, { useState, useEffect } from 'react'

/** C 代表 concise */
interface CInfomation {
  hash: string
  title: string
  format: 'EPUB' | 'TEXT'
  cover: string | null
  progress: number
}

const placeholder = require('@static/illustration/undraw_void_3ggu.svg').default

export default function Book ({ hash, cover, title, format, progress }: CInfomation): JSX.Element {

  return (
    <div className="book-wrapper common-active" title={title} data-hash={ hash }>
      <div className="flex-box book-cover">
        {
          cover
            ? (
              <div style={{
                width: '100%',
                height: '100%',

                backgroundImage: `url(${cover})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}>
              </div>
            )
            : (<img src={ placeholder } width="80" draggable="false"/>)
        }
      </div>
      <p className="common-ellipsis book-title">{ title }</p>
      <p className="book-description">{ format }</p>
      <p className="book-progress">{ progress }</p>
    </div>
  )
}