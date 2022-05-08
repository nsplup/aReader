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


function init () {
  /** 在目录生成data文件夹 */
  fs.mkdir('./data', (err) => { if (err) { console.log(err) }})
  /** 「导入书籍」按钮事件处理 */
  ipcMain.on(OPEN_DIALOG, (event: Electron.IpcMainEvent) => {
    dialog.showOpenDialog(BrowserWindow.getFocusedWindow(), {
      filters: [{ name: 'eBook', extensions: ['epub', 'txt'] }],
      properties: ['openFile', 'multiSelections']
    })
      .then(({ filePaths }) => {
        if (filePaths.length > 0) {
          event.reply(START_IMPORT, filePaths.length)
          const loadProcess = new Worker('./resources/app/build/dist/prod/loadProcess.js')
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
    fs.readFile('./data/.library', { encoding: 'utf-8' }, (err, data) => {
      let library: Library
      if (err) {
        library = {
          shelf: [],
          data: {}
        }
        fs.writeFile('./data/.library', JSON.stringify(library), (err) => {
          if (err) { console.log(err) }
        })
        event.reply(LOAD_LIBRARY, library)
      } else {
        library = JSON.parse(data)
        const tasks: any = []

        if (library.shelf.length === 0) {
          event.reply(LOAD_LIBRARY, library)
        } else {
          library.shelf.forEach(hash => {
            tasks.push(new Promise((res, rej) => {
              fs.readFile(path.resolve('./data', hash, '.infomation'), { encoding: 'utf-8' }, (err, data) => {
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
      }
    })
    /** 读取.userconfig如果不存在则创建 */
    fs.readFile('./data/.userconfig', { encoding: 'utf-8' }, (err, data) => {
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
        fs.writeFile('./data/.userconfig', JSON.stringify(userconfig), (err) => {
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
  ipcMain.on(READ_BOOK, (event: Electron.IpcMainEvent, { hash, href, format, progress }) => {
    try {
      if (format === 'EPUB') {
        const resolvedPath = findFile(path.basename(href), path.resolve('./data', hash))
        
        fs.readFile(resolvedPath[0], { encoding: 'utf-8' }, (err, data) => {
          const start = data.indexOf('<body')
          const end = data.indexOf('</body>')
          const content = data.slice(start, end)
            /** 去除标签 */
            .replace(/<script\b[^>]*>[\s\S]*<\/script>/g, '')
            .replace(/<\/?[^>]+>/g, fragment => {
              switch (true) {
                case /^<\/?(ruby|rtc?|rp|rb)/.test(fragment):
                  return fragment
                case /^<\/?(p|li)/.test(fragment):
                  return '\n'
                default:
                  return ''
              }
            })
          event.reply(LOAD_BOOK, { content, status: 'sucess', href, format, progress })
        })
      } else {
        const resolvedPath = findFile('.content', path.resolve('./data', hash))
  
        fs.readFile(resolvedPath[0], { encoding: 'utf-8' }, (err, data) => {
          event.reply(LOAD_BOOK, { content: JSON.parse(data), status: 'sucess', href, format, progress })
        })
      }
    } catch (err) {
      event.reply(LOAD_BOOK, { content: null, status: 'fail', href, format, progress })
    }
  })

  /** 处理搜索 */
  let cacheProcess: any = null
  ipcMain.on(START_SEARCH, (event: Electron.IpcMainEvent, message) => {
    const searchProcess = new Worker('./resources/app/build/dist/prod/searchProcess.js')
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
    const resolvedPath = path.join('./data', hash)
    recursiveDelete(resolvedPath)
  })

  /** 处理全屏切换 */
  ipcMain.on(TOGGLE_FULLSCREEN, (event: Electron.IpcMainEvent, status) => {
    const win = BrowserWindow.getFocusedWindow()
    win.setFullScreen(status)
  })

  /** 保存library */
  const handleSaveLibrary = debounce((library: Library) => {
    const data = Object.entries(library.data)
    const filtedData: any = {}

    for (let i = 0, len = data.length; i < len; i++) {
      const [hash, bookInfo] = data[i]
      filtedData[hash] = { bookmark: bookInfo.bookmark }
    }

    fs.writeFile(
      './data/.library',
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
      './data/.userconfig',
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