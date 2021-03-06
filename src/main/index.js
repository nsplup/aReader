const { app, BrowserWindow, Menu, ipcMain } = require('electron')
const { CODE_OPEN_DEV_TOOLS } = require('@constants')
const { basic } = require('@/modules/basic')

let win

function createWindow () {
  win = new BrowserWindow({
    title: '镜览',
    Width: 950,
    minWidth: 650,
    Height: 600,
    minHeight: 500,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    }
  })
  
  win.loadFile(
    process.env.NODE_ENV === 'development'
      ? './index.html'
      : './build/dist/prod/index.html'
  )
  win.webContents.setZoomFactor(0.9)
  win.on('closed',() => {
    win = null
  })
}

app.whenReady()
  .then(() => {
    createWindow()
    if (process.env.NODE_ENV === 'development') {
      win.webContents.openDevTools()
    }

    /** 调试模式：打开开发者工具 */
    ipcMain.on(CODE_OPEN_DEV_TOOLS, () => win.webContents.openDevTools())
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
      }
    })
  })

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

basic.init()

Menu.setApplicationMenu(Menu.buildFromTemplate([])) /** 隐藏菜单栏 */
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
 app.quit()
} else {
 app.on('second-instance', (event, commandLine, workingDirectory) => {
   if (win) {
     if (win.isMinimized()) win.restore()
     win.focus()
     win.show()
   }
 })
}