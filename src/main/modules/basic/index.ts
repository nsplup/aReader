import { ipcMain, dialog, BrowserWindow } from 'electron'
import { getFonts } from 'font-list'
import {
  OPEN_DIALOG,
  WINDOW_READY,
  FONTS_READY,
} from '@constants'
import path from 'path'

// const workpool = require('workerpool')
// const pool = workpool.pool()

function init () {
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
  ipcMain.once(WINDOW_READY, (event: Electron.IpcMainEvent) => {
    getFonts({ disableQuoting: true })
      .then(fonts => {
        event.reply(FONTS_READY, fonts)
      })
  })
}


const basic = { init }

export { basic }