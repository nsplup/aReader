const { app, BrowserWindow, Menu } = require('electron')
const path = require('path')

function createWindow () {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      // preload: path.join(app.getAppPath(), 'preload.js')
    }
  })
  
  win.loadFile('./index.html')
}

app.whenReady()
  .then(() => {
    createWindow()

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

// Menu.setApplicationMenu(Menu.buildFromTemplate([])) /** 隐藏菜单栏 */