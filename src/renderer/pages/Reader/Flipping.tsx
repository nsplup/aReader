import React, { useState, useRef, useEffect } from 'react'

interface Props {
  className?: string
  value: string | number
  duration?: number
}

export default function Flipping ({
  className,
  value,
  duration = 300,
}: Props) {
  const [flippingValue, setFlippingValue] = useState(value)

  const template = useRef(null as HTMLSpanElement)
  
  const [wapperStyle, setWapperStyle] = useState({
    display: 'inline-block',
    overflow: 'hidden',
    transition: `width ${duration / 2}ms ease-out, height ${duration / 2}ms ease-out`
  })
  const templateStyle = { visibility: 'hidden', position: 'absolute' } as React.CSSProperties
  const [resetStyle] = useState({ float: 'left' } as React.CSSProperties)
  const [contentStyle, setContentStyle] = useState({} as React.CSSProperties)

  const handleFlipContext = useRef({
    isFlipping: false,
    waitForFlip: null,
    flippedValue: value
  })

  const handleResize = () => {
    const { offsetWidth, offsetHeight } = template.current

    setWapperStyle(Object.assign({}, wapperStyle, {
      width: offsetWidth,
      height: offsetHeight
    }))
    setContentStyle({
      width: offsetWidth,
      height: offsetHeight * 2
    })
  }

  const handleTransitionEnd = () => {
    const { current: context } = handleFlipContext

    context.flippedValue = flippingValue
    context.isFlipping = false
    setContentStyle(Object.assign({}, contentStyle, {
      transition: 'unset',
      transform: 'translate3d(0, 0, 0)'
    }))

    const { waitForFlip, flippedValue } = context

    if (waitForFlip && waitForFlip !== flippedValue) {
      handleResize()
      setFlippingValue(waitForFlip)
      context.waitForFlip = null
    }
  }

  useEffect(handleResize, [])

  useEffect(() => {
    const { current: context } = handleFlipContext
    const { isFlipping } = context

    if (isFlipping) {
      context.waitForFlip = value
    } else {
      handleResize()
      setFlippingValue(value)
    }
  }, [value])

  useEffect(() => {
    handleFlipContext.current.isFlipping = true
    setContentStyle(Object.assign({}, contentStyle, {
      transition: `transform ${duration}ms ease-out`,
      transform: 'translate3d(0, -50%, 0)'
    }))
    const timer = setTimeout(handleTransitionEnd, duration)

    return () => clearTimeout(timer)
  }, [flippingValue])

  return (
    <span style={wapperStyle}>
      <span className={className} style={templateStyle} ref={template}>{value}</span>
      <div style={contentStyle}>
        <span className={className} style={resetStyle}>
          {handleFlipContext.current.flippedValue}
        </span>
        <span className={className} style={resetStyle}>{flippingValue}</span>
      </div>
    </span>
  )
}