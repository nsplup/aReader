const fs = require('fs')
const path = require('path')
const loadEPUB = require('./epub')
const loadTEXT = require('./text')
const getFileMimeType = require('./getFileMimeType')
const promise_finish = require('./promise-extends')

const { parentPort } = require('worker_threads')

/** message: { paths: pathArr } */
parentPort.on('message', (message) => {
  const { paths } = message
  const formats = []

  for (let i = 0, len = paths.length; i < len; i++) {
    const filePath = path.resolve(paths[i])
    const buffer = fs.readFileSync(filePath)
    formats.push([filePath, getFileMimeType(buffer)])
  }

  const tasks = []
  for (let i = 0, len = formats.length; i < len; i++) {
    const filePath = formats[i][0]
    const format = formats[i][1]
    if (format === 'epub') {
      tasks.push(new Promise((res, rej) => loadEPUB(filePath, res, rej)))
    } else {
      tasks.push(new Promise((res, rej) => loadTEXT(filePath, res, rej)))
    }
  }
  promise_finish(tasks)
    .then(res => parentPort.postMessage({ result: res }))
})