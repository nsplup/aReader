import React, { useEffect, useRef, useState } from 'react'

import { classNames } from '@utils/classNames'

export default function Toast ({ msg, detail, duration = 1000 * 2 }:
  { msg: string, detail?: string, duration?: number }) {
  const [message, setMessage] = useState(msg)
  const [isActive, setIsActive] = useState(false)
  const [btnStatus, setBtnStatus] = useState(false)
  const timer = useRef(null)
  const toast = useRef<HTMLDivElement>(null)

  const reset = () => {
    setIsActive(false)
    setBtnStatus(false)
  }
  const handleEnter = () => {
    clearTimeout(timer.current)
    timer.current = null
  }
  const handleLeave = () => {
    if (!btnStatus) {
      timer.current = setTimeout(reset, duration)
    }
  }
  const handleClick = () => {
    if (btnStatus === false) {
      setBtnStatus(true)
      handleEnter()
    } else {
      reset()
    }
  }

  useEffect(() => {
    if (message !== msg) {
      setIsActive(true)
      setMessage(msg)
      timer.current = setTimeout(reset, duration)
    }
  }, [msg])

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      e.stopPropagation()
    }
    toast.current.addEventListener('wheel', handleWheel, { passive: false })

    return () => {
      toast.current.removeEventListener('wheel', handleWheel)
    }
  }, [])

  return (
    <div
      className={classNames(
        'c-toast-wrapper',
        {
          'c-t-has-detail': typeof detail === 'string',
          'c-t-is-active': isActive,
          'c-t-view-more': btnStatus
        }
      )}
      onMouseEnter={ handleEnter }
      onMouseLeave={ handleLeave }
      >
      <div className="c-toast-main" ref={ toast }>
        { msg }
        {
          typeof detail === 'string'
            ? (
              <button className="c-toast-btn common-active" onClick={ handleClick }>
                { !btnStatus ? '详情' : '关闭' }
              </button>
              )
            : null
        }
      </div>
      <div className="c-toast-detail">
        <div>
          <p>{ detail }</p>
        </div>
      </div>
    </div>
  )
}