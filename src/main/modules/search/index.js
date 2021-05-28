const fs = require('fs')
const path = require('path')
const findFile = require('./findFile')
const promise_finish = require('./promise-extends')

const { parentPort } = require('worker_threads')
const offset = 25

function matchAll (haystack, needle) {
  const result = []
  let index = 0

  while ((index + needle.length) <= haystack.length) {
    let n = haystack.slice(index).indexOf(needle)

    if (n > 0) {
      result.push(n + index)
      index += n
    }
    index += needle.length
  }

  return result
}

function sliceStr (str, indexes, kLen) {
  const fragments = []

  if (indexes.length === 1) {
    const index = indexes[0]
    return [str.slice(
      Math.max(
        0,
        index - offset
      ),
      index + offset
    )]
  }
  for (let i = 0, len = indexes.length; i < len - 1; i++) {
    const front = Math.max(
      0,
      indexes[i] - offset
    )
    let back = indexes[i] + offset + 1

    if (back >= indexes[i + 1]) {
      back += kLen
      i++
    }
    fragments.push(str.slice(front, back))
  }
  return fragments
}

parentPort.on('message', (message) => {
  const { bookInfo, keyword } = message
  const { spine, hash, manifest, format } = bookInfo
  const tasks = []
  
  try {
    if (format === 'EPUB') {
      const resolvedPaths = []
      for (let i = 0, len = spine.length; i < len; i++) {
        const id = spine[i]
        resolvedPaths.push([
          id,
          findFile(
            manifest[id].href,
            path.resolve('./data', hash)
          )[0]
        ])
      }
  
      for (let i = 0, len = resolvedPaths.length; i < len; i++) {
        const filePath = resolvedPaths[i][1]
        tasks.push(new Promise((res, rej) => {
          const tmp = { id: resolvedPaths[i][0], result: [] }
          fs.readFile(filePath, { encoding: 'utf-8' }, (err, data) => {
            data = data.replace(/(<\/?[^>]+>)|([\r\n])/g, '')
            let result = matchAll(data, keyword)
            if (result.length > 0) {

              result = sliceStr(data, result, keyword.length)
              res(Object.assign(tmp, { result }))
            } else {
              rej()
            }
          })
        }))
      }
  
      promise_finish(tasks)
        .then(({ resolve }) => {
          parentPort.postMessage({ result: resolve })
        })
    } else {
      const results = []
      fs.readFile(path.resolve('./data', hash, '.content'), { encoding: 'utf-8' }, (err, data) => {
        data = JSON.parse(data)
  
        for (let i = 0, len = spine.length; i < len; i++) {
          const id = spine[i]
          const { href } = manifest[id]
          const text = data[href].replace(/[\r\n]/g, '')
          let result = matchAll(text, keyword)
  
          if (result.length > 0) {
            result = sliceStr(text, result, keyword.length)
            results.push({ id, result })
          }
        }
        parentPort.postMessage({ result: results })
      })
    }
  } catch (err) {
    parentPort.postMessage({ result: 'error' })
  }
})