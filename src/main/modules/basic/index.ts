import { App, ipcMain, dialog, BrowserWindow } from 'electron'
import { OPEN_DIALOG } from '@constants'
import path from 'path'

function bind (App: App) {
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
}


const basic = { bind }

export { basic }