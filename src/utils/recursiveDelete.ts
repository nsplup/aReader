import { statSync, readdirSync, unlinkSync, rmdirSync } from 'fs'
import { resolve, join } from 'path'

export function recursiveDelete (filePath: string) {
  filePath = resolve(filePath)

  if (statSync(filePath).isDirectory()) {
    const files = readdirSync(filePath)

    for (let i = 0, len = files.length; i < len; i++) {
      const file = join(filePath, files[i])
      if (statSync(file).isDirectory()) {
        recursiveDelete(file)
      } else {
        unlinkSync(file)
        console.log(`${file} is deleted.`)
      }
    }

    rmdirSync(filePath)
    console.log(`${filePath} is deleted.`)
  } else {
    unlinkSync(filePath)
    console.log(`${filePath} is deleted.`)
  }
}
