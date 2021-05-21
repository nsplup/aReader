const { app, BrowserWindow, Menu } = require('electron')
// import path from 'path'

function createWindow () {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {

    }
  })
  
  win.loadFile('./src/main/index.html')
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

Menu.setApplicationMenu(Menu.buildFromTemplate([])) /** 隐藏菜单栏 */