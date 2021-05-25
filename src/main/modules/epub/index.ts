import _7z from 'node-7z'
const _7zbin = require('7zip')['7z']
import fxp from 'fast-xml-parser'
import path from 'path'
import fs from 'fs'
import { findFile } from '@utils/findFile'
import { getFileMimeType } from '@utils/getFileMimeType'


// const defaultInfo = {
//   title: '',
//   format: 'EPUB',
//   createdTime: 0,
//   cover: null,
//   manifest: [],
//   spine: [],
//   nav: [],
//   bookmark: {
//     default: [],
//     detail: []
//   },
// }

function loadEPUB (filePath: string, res: Function, rej: Function) {
  /** 计算 SHA256 */
  _7z.hash(path.resolve(filePath), { hashMethod: 'sha256', $bin: _7zbin })
    .on('data', (data) => {
      const { hash } = data
      const bookPath = path.resolve(__dirname, hash)
      const infomation: any = { format: 'EPUB', createdTime: Date.now() }

      fs.readdir(bookPath, (err, files) => {
        /** 是否存在书籍缓存 */
        if (err) {
          /** 解压后读取 */
          _7z.extractFull(path.resolve(filePath), bookPath, { $bin: _7zbin })
            .on('end', () => loadEPUB(filePath, res, rej))
          return
        }
        /** 缓存文件是否丢失 */
        if (files.includes('.infomation')) {
          fs.readFile(
            path.resolve(bookPath, '.infomation'),
            { encoding: 'utf8' },
            (err, data) => {
              res([hash, JSON.parse(data)])
            }
          )
        } else {
          fs.readFile(
            path.resolve(bookPath, 'META-INF/container.xml'),
            { encoding: 'utf8' },
            (err, data) => {
              /** META-INF是否丢失 */
              if (err) {
                rej('读取失败：META-INF文件丢失')
                return
              }
              /** 从META-INF获取content.opf路径 */
              const option = { attributeNamePrefix : '', ignoreAttributes: false }
              const contentPath = fxp.parse(data, option)
                .container
                .rootfiles
                .rootfile['full-path']
              
              /** 读取content.opf */
              fs.readFile(
                path.resolve(bookPath, contentPath),
                { encoding: 'utf8' },
                (err, data) => {
                  if (err) {
                    rej('读取失败：content.opf文件丢失')
                    return
                  }

                  const filename = path.basename(filePath).split('.')[0]
                  const content = fxp.parse(data, option).package
                  const { metadata, manifest, spine } = content
                  const cover = [].concat(metadata.meta)
                    .filter((meta) => meta.name === 'cover')[0]

                  /** 获取标题 */
                  infomation.title = metadata['dc:title']
                    ? metadata['dc:title']
                    : filename
                  /** 获取manifest */
                  if (manifest && manifest.item) {
                    infomation.manifest = manifest.item
                  } else {
                    rej('读取失败：不是合法的content.opf文件')
                    return
                  }

                  /** 获取封面 */
                  if (typeof cover === 'object') {
                    let coverPath = cover.content
                    const regExp = /\..+$/
                    /** 是否为路径 */
                    if (!regExp.test(coverPath)) {
                      coverPath = infomation.manifest.filter(({ id }: any) => id === coverPath)[0]
                      if (typeof coverPath === 'object' && coverPath.href) {
                        coverPath = coverPath.href
                      }
                    }
                    /** 文件存在检测 */
                    coverPath = findFile(path.basename(coverPath), bookPath)

                    if (coverPath.length > 0) {
                      const buffer = fs.readFileSync(coverPath[0])
                      /** 文件头检测 */
                      if (['bmp', 'gif', 'jpg', 'png', 'webp'].includes(getFileMimeType(buffer))) {
                        infomation.cover = coverPath[0]
                      }
                    }
                  }

                  /** 获取spine */
                  if (spine && spine.itemref) {
                    infomation.spine = spine.itemref.map(({ idref }: any) => idref)
                  } else {
                    /** 从manifest生成spine */
                    infomation.spine = infomation.manifest.map(({ id }: any) => id)
                  }

                  /** 获取目录 */
                  fs.readFile(
                    findFile('toc.ncx', bookPath)[0],
                    { encoding: 'utf8' },
                    (err, data) => {
                      if (err) {
                        console.log('获取目录失败：toc.ncx文件丢失')
                      }
                      /** 目录转化 */
                      const formatNav = (navPoints: any, isSub = false) => {
                        let results: Nav[] = [];

                        [].concat(navPoints).forEach(({
                          id, navLabel, content, navPoint
                        }) => {
                          let nav = {
                            id,
                            navLabel: navLabel.text,
                            href: content.src,
                            isSub
                          }
                          results.push(nav)
                          if (typeof navPoint === 'object') {
                            results.push(...formatNav(navPoint, true))
                          }
                        })
                        return results
                      }
                      let nav = formatNav(fxp.parse(data, option).ncx.navMap.navPoint)

                      infomation.nav = nav

                      res([hash, infomation])

                      /** 保存缓存文件 */
                      fs.writeFile(
                        path.resolve(bookPath, '.infomation'),
                        JSON.stringify(infomation),
                        (err) => { if (err) { rej('.infomation 文件保存失败') } }
                      )
                    }
                  )
              })
          })
        }
      })
    })
}

export { loadEPUB }