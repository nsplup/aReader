const path = require('path')
const fs = require('fs')

function findFile (fileName, dirPath) {
  const results = []

  fs.readdirSync(path.resolve(dirPath))
    .forEach(file => {
      let _path = path.join(dirPath, file)
      if (fs.lstatSync(_path).isDirectory()) {
        const rec = findFile(fileName, _path)
        if (rec.length > 0) {
          results.push(...rec)
        }
      } else {
        if (file === fileName) {
          results.push(_path)
        }
      }
    })
  
  return results
}

module.exports = findFile