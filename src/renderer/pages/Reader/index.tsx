import React, { useState, useEffect, useRef } from 'react'
import Slider from 'react-slider'

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

export default function Reader (): JSX.Element {

  return (
    <div className="reader-wrapper">
      {/* <CustomSlider max={5} step={0.05}/> */}
      <div className="flex-box reader-toolbar">
        <div className="flex-box reader-tools">
          <i className="reader-tool common-active ri-arrow-left-line">
            <span className="reader-tool-tips">返回</span>
          </i>
          <i className="reader-tool common-active ri-bookmark-line">
            <span className="reader-tool-tips">插入书签</span>
          </i>
          <i className="reader-tool common-active ri-file-paper-2-line">
            <span className="reader-tool-tips">滚动模式</span>
          </i>
          <i className="reader-tool common-active ri-book-open-line">
            <span className="reader-tool-tips">分页模式</span>
          </i>
          <i className="reader-tool common-active ri-list-unordered">
            <span className="reader-tool-tips">目录</span>
          </i>
          <i className="reader-tool common-active ri-text">
            <span className="reader-tool-tips">字体样式</span>
          </i>
          <i className="reader-tool common-active ri-palette-fill">
            <span className="reader-tool-tips">配色方案</span>
          </i>
          <i className="reader-tool common-active ri-search-line">
            <span className="reader-tool-tips">全文检索</span>
          </i>
          <i className="reader-tool common-active ri-skip-back-fill">
            <span className="reader-tool-tips">上一章</span>
          </i>
          <span className="reader-pnum">9999</span>
          <i className="reader-tool common-active ri-skip-forward-fill">
            <span className="reader-tool-tips">下一章</span>
          </i>
          <i className="reader-tool common-active ri-fullscreen-line">
            <span className="reader-tool-tips">全屏模式</span>
          </i>
        </div>
      </div>
    </div>
  )
}