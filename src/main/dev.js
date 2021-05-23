const { app, BrowserWindow, Menu } = require('electron')
const { basic } = require('@/modules/basic')
const path = require('path')

function createWindow () {
  const win = new BrowserWindow({
    title: '镜览',
    Width: 950,
    minWidth: 650,
    Height: 600,
    minHeight: 430,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
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

basic.bind(app)
