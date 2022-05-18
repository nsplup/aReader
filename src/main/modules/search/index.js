const fs = require('fs')
const path = require('path')
const findFile = require('./findFile')
const promise_finish = require('./promise-extends')
const convertEPUB = require('../convertEPUB')
const { parentPort } = require('worker_threads')
const DATA_PATH = process.env.WORKER_ENV === 'development'
  ? path.resolve('./build/dist/dev/data')
  : path.resolve('.', 'data')

const MAX_LENGTH = 10
/** 非单引号、英文、数字、空格、中日韩字符 */
const REGEXP = /[^\'\’\a-zA-Z0-9\s\u2E80-\u2FDF\u3040-\u318F\u31A0-\u31BF\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FFF\uA960-\uA97F\uAC00-\uD7FF]+/
function sliceString (haystack, needle, maxLength) {
  let index = haystack.indexOf(needle)

  /** 不满足条件时跳出 */
  if (index < maxLength || haystack.length < maxLength) { return haystack }

  /** 确保最少偏移量 */
  index = Math.max(index - maxLength, 0)

  /** 向前查找，直到命中标点符号 */
  let i = 1
  while (i < maxLength && !REGEXP.test(haystack.charAt(index - i))) {
    if (index - i < 0) { break }
    i++
  }
  index -= i

  /** 当下标不为零且左侧不为标点符号（排除成对标点情况）时，下标步进一 */
  if (index !== 0 && !REGEXP.test(haystack.charAt(index - 1))) { index += 1 }

  /** 如果下标大于等于二且左侧两个字符为标点符号且为重复标点时，下标步进一 */
  if (index >= 2
      && REGEXP.test(haystack.charAt(index - 1))
      && haystack.charAt(index - 1) === haystack.charAt(index)
  ) { index += 1 }

  /** 如果命中字母则向前查找，直到命中非字母 */
  let j = 0
  while (index - j > 0 && /[a-z]/i.test(haystack.charAt(index - j))) { j++ }
  /** 如果是字母则更新下标并步进一 */
  if (j > 0) { index -= j; index += 1 }

  return haystack.slice(index)
}

function computeString (haystack, needle, regExp) {
  return (
      haystack.length > MAX_LENGTH * 3
      ? sliceString(haystack, needle, MAX_LENGTH)
      : haystack
    )
    .trimStart()
    .replace(regExp, fragment => {
      return `<span class="s-m-search-ky">${fragment}</span>`
    })
}

function sortArray (array) {
  const result = array.concat()

  result.sort((a, b) => {
    let aPN = a.pageNumber.toString(),
        aLC = a.lineCount.toString(),
        bPN = b.pageNumber.toString(),
        bLC = b.lineCount.toString()
    
    aPN = '0'.repeat(10 - aPN.length) + aPN
    aLC = '0'.repeat(10 - aLC.length) + aLC
    bPN = '0'.repeat(10 - bPN.length) + bPN
    bLC = '0'.repeat(10 - bLC.length) + bLC
    return parseInt('1' + aPN + aLC) - parseInt('1' + bPN + bLC)
  })

  return result
}

parentPort.on('message', (message) => {
  const { bookInfo, keyword } = message
  const { spine, hash, manifest, format } = bookInfo
  const tasks = []

  const keywords = keyword.split(/\s+/)
  const REGEXP_KW = new RegExp(keywords.join('|'), 'gi')
  const results = []
  
  try {
    if (format === 'EPUB') {
      const resolvedPaths = []
      for (let i = 0, len = spine.length; i < len; i++) {
        const id = spine[i]
        resolvedPaths.push([
          i,
          id,
          findFile(
            path.basename(manifest[id].href),
            path.resolve(DATA_PATH, hash)
          )[0]
        ])
      }
  
      for (let i = 0, len = resolvedPaths.length; i < len; i++) {
        const [pageNumber, id, filePath] = resolvedPaths[i]
        tasks.push(new Promise((res, rej) => {
          fs.readFile(filePath, { encoding: 'utf-8' }, (err, data) => {
            if (err) { console.log(err); rej() }

            const lines = convertEPUB(data)
              .map(node => node.innerText)
            if (REGEXP_KW.test(lines.join('\n'))) {
              keywords.forEach(kw => {
                lines.forEach((line, index) => {
                  if (line.toLocaleLowerCase().includes(kw.toLocaleLowerCase())) {
                    results.push({
                      pageNumber,
                      id,
                      lineCount: index,
                      text: computeString(line, kw, REGEXP_KW)
                    })
                  }
                })
              })
              res()
            } else {
              rej()
            }
          })
        }))
      }

      promise_finish(tasks)
        .then(({ resolve }) => {
          parentPort.postMessage({ result: sortArray(results) })
        })
    } else {
      fs.readFile(path.resolve(DATA_PATH, hash, '.content'), { encoding: 'utf-8' }, (err, data) => {
        data = JSON.parse(data)
  
        for (let i = 0, len = spine.length; i < len; i++) {
          const id = spine[i]
          const { href } = manifest[id]
          const content = data[href]
          const lines = content.split(/[\r\n]+/g)

          if (REGEXP_KW.test(content)) {
            keywords.forEach(kw => {
              lines.forEach((line, index) => {
                if (line.toLocaleLowerCase().includes(kw.toLocaleLowerCase())) {
                  results.push({
                    pageNumber: i,
                    id,
                    lineCount: index,
                    text: computeString(line, kw, REGEXP_KW)
                  })
                }
              })
            })
          }
        }
        parentPort.postMessage({ result: sortArray(results) })
      })
    }
  } catch (err) {
    parentPort.postMessage({ result: 'error' })
  }
})