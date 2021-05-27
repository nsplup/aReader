import { ipcMain, dialog, BrowserWindow } from 'electron'
import { getFonts } from 'font-list'
import {
  OPEN_DIALOG,
  WINDOW_READY,
  FONTS_READY,
  LOAD_LIBRARY,
  LOAD_USERCONFIG,
} from '@constants'
import fs from 'fs'
import { Worker } from 'worker_threads'

// const loadProcess = new Worker('./loadProcess.js')
// loadProcess.postMessage({ paths: process.argv.slice(2) })

// loadProcess.on('message', (message) => {
//   console.log(message.result)
// })

function init () {
  /** 在目录生成data文件夹 */
  fs.mkdir('./data', (err) => { if (err) { console.log(err) }})
  /** 「导入书籍」按钮事件处理 */
  ipcMain.on(OPEN_DIALOG, () => {
    dialog.showOpenDialog(BrowserWindow.getFocusedWindow(), {
      filters: [{ name: 'eBook', extensions: ['epub', 'txt'] }],
      properties: ['openFile', 'multiSelections']
    })
      .then(({ filePaths }) => {
        if (filePaths.length > 0) {
          console.log(filePaths.join('\n'))
        }
      })
  })
  
  /** 获取字体列表 */
  ipcMain.on(WINDOW_READY, (event: Electron.IpcMainEvent) => {
    getFonts({ disableQuoting: true })
      .then(fonts => {
        event.reply(FONTS_READY, fonts)
        /** 读取.library如果不存在则创建 */
        fs.readFile('./data/.library', { encoding: 'utf-8' }, (err, data) => {
          let library: Library
          if (err) {
            library = {
              history: [],
              categories: [
                {
                  name: '默认',
                  books: [],
                }
              ]
            }
            fs.writeFile('./data/.library', JSON.stringify(library), (err) => {
              if (err) { console.log(err) }
            })
          } else {
            library = JSON.parse(data)
          }
          event.reply(LOAD_LIBRARY, library)
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
                lineHeight: 50,
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
      })
  })
}


const basic = { init }

export { basic }