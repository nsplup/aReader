import React, { useState, useEffect } from 'react'

export default function Placeholder (props: any): JSX.Element {

  return (
    <div
      style={{
        float: 'left',
        position: 'relative',
        width: '150px',
        height: '250px',
        marginRight: '20px',
      }}
      { ...props }
    >
      <svg
        width="150"
        height="250"
        viewBox="0 0 150 250"
      >
        <rect x="0" y="0" rx="10" ry="10" width="150" height="200" fill="#f7f7f7"></rect>
        <rect x="0" y="207.5" width="150" height="15" fill="#f7f7f7"></rect>
        <rect x="50" y="230" width="50" height="15" fill="#f7f7f7"></rect>
      </svg>
      <div className="com-p-a-1" style={{ borderRadius: '10px' }}>
        <div className="com-p-animation"></div>
      </div>
      <div className="com-p-a-2">
        <div className="com-p-animation"></div>
      </div>
      <div className="com-p-a-3">
        <div className="com-p-animation"></div>
        <div className="com-p-mask"></div>
        <div className="com-p-mask" style={{ transform: 'translate3d(200%, 0, 0)' }}></div>
      </div>
    </div>
  )
}