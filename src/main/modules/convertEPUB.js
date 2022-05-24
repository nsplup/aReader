const { parse } = require('node-html-parser')

const ignoreList = [
  'ruby',
  'rt',
  'rtc',
  'rp',
  'rb',
  'p',
  'li',
  'a',
  'span',
  'hr',
].concat(
  [...new Array(6).keys()].map(n => `h${n + 1}`),
)

function convertEPUB (data) {
  const body = data.match(/<body\b[^>]*>([\s\S]*)<\/body>/)[1]
    /** 去除标签 */
    .replace(/<script\b[^>]*>[\s\S]*<\/script>/g, '')
  const content = body.replace(/<\/?[^>]+>/g, fragment => {
    let [tagName, ...attributes] = fragment.split(/\s/)

    tagName = tagName.replace(/[<\/>]/g, '')
      .toLowerCase()
    
    switch (tagName) {
      case 'div':
        return fragment.startsWith('</')
          ? '</p>'
          : `<p ${attributes.join(' ')}>`.replace(/>{2,}/, '>')
      default:
        return ignoreList.includes(tagName)
          ? fragment
          : ''
    }
  })

  return parse(content).childNodes
    .filter((node) => {
      return node.innerText.replace(/\s|(&nbsp;)/g, '').length > 0
      || (/<(img|image|hr)[^>]+>/gi).test(node.toString())
    })
}

module.exports = convertEPUB