const { app, BrowserWindow, Menu } = require('electron')
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
  
  win.loadFile('./build/dist/prod/index.html')
  win.on('closed',() => {
    win = null
  })
}

app.whenReady()
  .then(() => {
    createWindow()
    win.webContents.setZoomFactor(0.9)
    win.webContents.openDevTools()

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