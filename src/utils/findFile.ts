import fs from 'fs'
import path from 'path'

function findFile (fileName: string, dirPath: string) {
  const results: string[] = []

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

export { findFile }