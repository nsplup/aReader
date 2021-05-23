export function toCSSText (style: React.CSSProperties) {
  return Object.entries(style)
    .map((kVal) => (`${kVal[0]}: ${typeof kVal[1] === 'number' ? kVal[1] + 'px' : kVal[1]}`))
    .join('; ')
}