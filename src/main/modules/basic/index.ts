import { App, ipcMain, dialog } from 'electron'
import { OPEN_DIALOG } from '@constants'
import path from 'path'

function bind (App: App) {
  /** 「导入书籍」按钮事件处理 */
  ipcMain.on(OPEN_DIALOG, () => {
    dialog.showOpenDialog({
      filters: [{ name: 'eBook', extensions: ['epub', 'txt'] }],
      properties: ['openFile']
    })
      .then(({ filePaths }) => {
        if (filePaths.length > 0) {
          console.log(filePaths[0], path.resolve('./'))
        }
      })
  })
}


const basic = { bind }

export { basic }