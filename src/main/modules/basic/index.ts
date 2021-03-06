import { ipcMain, dialog, BrowserWindow } from 'electron'
import { getFonts } from 'font-list'
import {
  OPEN_DIALOG,
  WINDOW_READY,
  FONTS_READY,
  LOAD_LIBRARY,
  LOAD_USERCONFIG,
  READ_BOOK,
  LOAD_BOOK,
  START_IMPORT,
  IMPORT_BOOK,
  START_SEARCH,
  STOP_SEARCH,
  SEARCH_RESULT,
  DELETE_BOOK,
  TOGGLE_FULLSCREEN,
  SAVE_LIBRARY,
  SAVE_USERCONFIG,
} from '@constants'
import fs from 'fs'
import path from 'path'
import { Worker } from 'worker_threads'
import { findFile } from '@utils/findFile'
import { _Promise } from '@utils/promise-extends'
import { recursiveDelete } from '@utils/recursiveDelete'
import { debounce } from '@utils/debounce'
import convertEPUB from '../convertEPUB'

function choosePath (pathA: string, pathB: string) {
  return process.env.NODE_ENV === 'development'
    ? pathB
    : pathA
}
const DATA_PATH = choosePath('./data', './build/dist/dev/data')
const LIBRARY_PATH = path.resolve(DATA_PATH, '.library')
const USERCONFIG_PATH = path.resolve(DATA_PATH, '.userconfig')
const LOAD_PROCESS_PATH = choosePath(
  './resources/app/build/dist/prod/loadProcess.js',
  './build/dist/dev/loadProcess.js'
)
const SEARCH_PROCESS_PATH = choosePath(
  './resources/app/build/dist/prod/searchProcess.js',
  './build/dist/dev/searchProcess.js'
)

function init () {
  /** 在目录生成data文件夹 */
  fs.mkdir(DATA_PATH, (err) => { if (err) { console.log(err) }})
  /** 「导入书籍」按钮事件处理 */
  ipcMain.on(OPEN_DIALOG, (event: Electron.IpcMainEvent) => {
    dialog.showOpenDialog(BrowserWindow.getFocusedWindow(), {
      filters: [{ name: 'eBook', extensions: ['epub', 'txt'] }],
      properties: ['openFile', 'multiSelections']
    })
      .then(({ filePaths }) => {
        if (filePaths.length > 0) {
          event.reply(START_IMPORT, filePaths.length)
          const loadProcess = new Worker(LOAD_PROCESS_PATH, { env: { WORKER_ENV: process.env.NODE_ENV } })
          loadProcess.postMessage({ paths: filePaths })

          loadProcess.on('message', (message) => {
            event.reply(IMPORT_BOOK, message.result)
            loadProcess.terminate()
          })
        }
      })
  })
  
  /** 获取字体列表 */
  ipcMain.on(WINDOW_READY, (event: Electron.IpcMainEvent) => {
    /** 读取.library如果不存在则创建 */
    fs.readFile(LIBRARY_PATH, { encoding: 'utf-8' }, (err, data) => {
      let library: Library
      if (err) {
        library = {
          shelf: [],
          data: {}
        }
        fs.writeFile(LIBRARY_PATH, JSON.stringify(library), (err) => {
          if (err) { console.log(err) }
        })
        event.reply(LOAD_LIBRARY, library)
      } else {
        try{
          library = JSON.parse(data)
          const tasks: any = []
  
          if (library.shelf.length === 0) {
            event.reply(LOAD_LIBRARY, library)
          } else {
            library.shelf.forEach(hash => {
              tasks.push(new Promise((res, rej) => {
                fs.readFile(path.resolve(DATA_PATH, hash, '.infomation'), { encoding: 'utf-8' }, (err, data) => {
                  if (err) {
                    rej(hash)
                  } else {
                    res(JSON.parse(data))
                  }
                })
              }))
            })
            _Promise
              .finish(tasks)
              .then(({ resolve, reject }) => {
                resolve.forEach((infomation: Infomation) => {
                  const { hash } = infomation
                  
                  library.data[hash] = Object.assign({}, library.data[hash], infomation)
                })
                library.shelf = library.shelf.filter(hash => !reject.includes(hash))
                event.reply(LOAD_LIBRARY, library)
              })
          }
        } catch (err) {
          console.log(err)
        }
      }
    })
    /** 读取.userconfig如果不存在则创建 */
    fs.readFile(USERCONFIG_PATH, { encoding: 'utf-8' }, (err, data) => {
      let userconfig: UserConfig
      if (err) {
        userconfig = {
          renderMode: 'page',
          fontStyle: {
            fontFamily: '微软雅黑',
            fontSize: 18,
            textIndent: 0,
            lineHeight: 15,
          },
          colorPlan: {
            current: 0,
            custom: ['#b7a1ff', '#2e003e']
          }
        }
        fs.writeFile(USERCONFIG_PATH, JSON.stringify(userconfig), (err) => {
          if (err) { console.log(err) }
        })
      } else {
        userconfig = JSON.parse(data)
      }
      event.reply(LOAD_USERCONFIG, userconfig)
    })
    getFonts({ disableQuoting: true })
      .then(fonts => {
        event.reply(FONTS_READY, fonts)
      })
  })

  /** 获取书籍内容 */
  ipcMain.on(READ_BOOK, (event: Electron.IpcMainEvent, { hash, href, format, lineCount }) => {
    try {
      if (format === 'EPUB') {
        const resolvedPath = findFile(path.basename(href), path.resolve(DATA_PATH, hash))
        
        fs.readFile(resolvedPath[0], { encoding: 'utf-8' }, (err, data) => {
            event.reply(LOAD_BOOK, {
              content: convertEPUB(data).map(node => node.toString()).join(''),
              status: 'sucess',
              href,
              format,
              lineCount
            })
        })
      } else {
        const resolvedPath = findFile('.content', path.resolve(DATA_PATH, hash))
        fs.readFile(resolvedPath[0], { encoding: 'utf-8' }, (err, data) => {
          event.reply(LOAD_BOOK, { content: JSON.parse(data), status: 'sucess', href, format, lineCount })
        })
      }
    } catch (err) {
      event.reply(LOAD_BOOK, { content: null, status: 'fail', href, format, lineCount })
    }
  })

  /** 处理搜索 */
  let cacheProcess: any = null
  ipcMain.on(START_SEARCH, (event: Electron.IpcMainEvent, message) => {
    const searchProcess = new Worker(SEARCH_PROCESS_PATH, { env: { WORKER_ENV: process.env.NODE_ENV }})
    searchProcess.postMessage(message)
    cacheProcess = searchProcess

    searchProcess.on('message', (message) => {
      event.reply(SEARCH_RESULT, message.result)
      searchProcess.terminate()
      cacheProcess = null
    })
  })
  ipcMain.on(STOP_SEARCH, () => {
    if (cacheProcess !== null) {
      cacheProcess.terminate()
      cacheProcess = null
    }
  })

  /** 处理删除 */
  ipcMain.on(DELETE_BOOK, (event: Electron.IpcMainEvent, hash) => {
    const resolvedPath = path.join(DATA_PATH, hash)
    recursiveDelete(resolvedPath)
  })

  /** 处理全屏切换 */
  ipcMain.on(TOGGLE_FULLSCREEN, (event: Electron.IpcMainEvent, status) => {
    const win = BrowserWindow.getFocusedWindow()
    win && win.setFullScreen(status)
  })

  /** 保存library */
  const handleSaveLibrary = debounce((library: Library) => {
    const data = Object.entries(library.data)
    const filtedData: any = {}

    /** 过滤 Bookmark 外的属性 */
    for (let i = 0, len = data.length; i < len; i++) {
      const [hash, bookInfo] = data[i]
      filtedData[hash] = { bookmark: bookInfo.bookmark }
    }

    fs.writeFile(
      LIBRARY_PATH,
      JSON.stringify(Object.assign({}, library, { data: filtedData })),
      (err) => { if (err) { console.log(err) } }
    )
  }, 1000)
  ipcMain.on(SAVE_LIBRARY, (event: Electron.IpcMainEvent, library: Library) => {
    handleSaveLibrary(library)
  })

  /** 保存userconfig */
  const handleSaveUserConfig = debounce((userconfig: UserConfig) => {
    fs.writeFile(
      USERCONFIG_PATH,
      JSON.stringify(userconfig),
      (err) => { if (err) { console.log(err) } }
    )
  }, 1000)
  ipcMain.on(SAVE_USERCONFIG, (event: Electron.IpcMainEvent, userconfig: UserConfig) => {
    handleSaveUserConfig(userconfig)
  })
}


const basic = { init }

export { basic }