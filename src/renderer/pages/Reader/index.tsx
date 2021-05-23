import React, { useState, useEffect, useRef } from 'react'
import { FixedSizeList  } from 'react-window'
import { HexColorPicker } from 'react-colorful'
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

const ColorPlanRender = (text: string, background: string, index: number) => (
  <div
    style={{
      color: text,
      backgroundColor: background
    }}
    className="flex-box s-m-color-plan common-active" /** s-m-color-plan-current */
    data-plan={ index }
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
}

export default function Reader ({
  fonts,
}: Props): JSX.Element {
  const [textColor, setTextColor] = useState('')
  const [backgroundColor, setBackgroundColor] = useState('')

  return (
    <div className="reader-wrapper">
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
            {/* <span className="reader-tool-tips">分页模式</span> */}
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
      <div className="common-mask"></div>
      <div className="secondary-menu">
        {/* 字体样式 */}
        <div style={{ display: 'none' }} className="flex-box s-m-font">
          <div className="flex-box s-m-font-style">
            <div className="flex-box s-m-row">
              <p className="s-m-title">字体大小</p>
              <CustomSlider min={12} max={50} step={0.38}/>
            </div>
            <div className="flex-box s-m-row">
              <p className="s-m-title">首行缩进</p>
              <CustomSlider max={100}/>
            </div>
            <div className="flex-box s-m-row">
              <p className="s-m-title">行距</p>
              <CustomSlider max={100}/>
            </div>
          </div>
          <FixedSizeList
            width={ 280 }
            height={ 170 }
            itemCount={ fonts.length }
            itemSize={ 50 }
          >
            {
              ({ index, style }) => {
                const font = fonts[index]
                return (
                  <p style={Object.assign({ fontFamily: font }, style)} className="common-ellipsis common-active s-m-font-item">
                    { font }
                  </p>
                )
              }
            }
          </FixedSizeList>
        </div>
        {/* 配色方案 */}
        <div style={{ display: 'none' }} className="flex-box s-m-color">
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
                colorPlan.map((plan, index) => ColorPlanRender(plan[0], plan[1], index))
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
                <HexColorPicker onChange={ (val) => setTextColor(val) }/>
              </div>
              <div className="s-m-color-picker" style={{ marginRight: 'unset' }}>
                <p className="s-m-title">背景颜色</p>
                <HexColorPicker onChange={ (val) => setBackgroundColor(val) }/>
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
                { ColorPlanRender(textColor, backgroundColor, -1) }
                <p className="s-m-title">自定义方案</p>
              </div>
            </div>
          </div>
        </div>
        {/* 全文检索 */}
        <div style={{ display: 'none' }} className="flex-box s-m-search">
          <p className="s-m-title">全文检索</p>
          <div style={{ position: 'relative' }}>
            <button className="flex-box s-m-search-btn">
              <i className="ri-search-line"></i>
            </button>
            <input type="text" className="s-m-input" spellCheck="false"/>
          </div>
        </div>
      </div>
    </div>
  )
}