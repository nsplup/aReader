const os = require('os')
const path = require('path')

const platofrm = os.platform()
const arch = os.arch()
const basePath = process.env.WORKER_ENV === 'development'
  ? path.join('build', 'dependencies', '7z')
  : path.join('resources', 'build', 'dependencies', '7z')

const _7zPath = path.resolve(basePath, platofrm, arch, '7za.exe')

module.exports = _7zPath