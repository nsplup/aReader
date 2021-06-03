const _7z = require('node-7z')
const fxp = require('fast-xml-parser')
const path = require('path')
const fs = require('fs')
const findFile = require('./findFile')
const getFileMimeType = require('./getFileMimeType')

const dirName = path.resolve('.', 'data')
const _7zbin = path.resolve('./resources/app/node_modules/7zip/7zip-lite/7z.exe')

function loadEPUB (filePath, res, rej) {
  /** 计算 SHA256 */
  _7z.hash(path.resolve(filePath), { hashMethod: 'sha256', $bin: _7zbin })
    .on('data', (data) => {
      const { hash } = data
      const bookPath = path.resolve(dirName, hash)
      const infomation = { hash, format: 'EPUB', createdTime: Date.now() }

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
          res([filePath, true]) /** 格式：路径，是否已存在 */
        } else {
          fs.readFile(
            path.resolve(bookPath, 'META-INF/container.xml'),
            { encoding: 'utf8' },
            (err, data) => {
              /** META-INF是否丢失 */
              if (err) {
                rej([filePath, '读取失败：META-INF文件丢失'])
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
                    rej([filePath, '读取失败：content.opf文件丢失'])
                    return
                  }

                  const filename = path.basename(filePath).split('.')[0]
                  const content = fxp.parse(data, option).package
                  const { metadata, manifest, spine } = content
                  const cover = [].concat(metadata.meta)
                    .filter((meta) => meta && meta.name === 'cover')[0]

                  /** 获取标题 */
                  infomation.title = metadata['dc:title']
                    ? metadata['dc:title']
                    : filename
                  /** 获取manifest */
                  const manifestMap = {}
                  if (manifest && manifest.item) {
                    let temp = {}
                    for (let i = 0, len = manifest.item.length; i < len; i++) {
                      const item = manifest.item[i]
                      let { href, id } = item
                      href = href.split('#')[0]
                      temp[id] = {
                        href,
                        'media-type': item['media-type']
                      }
                      manifestMap[href] = id
                    }
                    infomation.manifest = temp
                  } else {
                    rej([filePath, '读取失败：不是标准的content.opf文件'])
                    return
                  }

                  /** 获取封面 */
                  if (typeof cover === 'object') {
                    let coverPath = cover.content
                    const regExp = /\..+$/
                    /** 是否为路径 */
                    if (!regExp.test(coverPath)) {
                      coverPath = infomation.manifest[coverPath]
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
                  let temp = []
                  if (spine && spine.itemref) {
                    for (let i = 0, len = spine.itemref.length; i < len; i++) {
                      const { idref } = spine.itemref[i]
                      const tm = infomation.manifest[idref]
                      if (tm && tm['media-type'] === 'application/xhtml+xml') {
                        temp.push(idref)
                      }
                    }
                  } else {
                    /** 从manifest生成spine */
                    for (let i = 0, len = manifest.item.length; i < len; i++) {
                      const tm = manifest.item[i]
                      if (tm && tm['media-type'] === 'application/xhtml+xml') {
                        temp.push(tm.id)
                      }
                    }
                  }
                  infomation.spine = temp

                  /** 获取目录 */
                  fs.readFile(
                    findFile('toc.ncx', bookPath)[0] || '',
                    { encoding: 'utf8' },
                    (err, data) => {
                      let nav
                      if (err) {
                        console.log('获取目录失败：toc.ncx文件丢失')
                        nav = []
                      } else {
                        /** 目录转化 */
                        const formatNav = (navPoints, isSub = false, pHad = []) => {
                          let results = []
                          const had = [].concat(pHad)
                          navPoints = [].concat(navPoints)
  
                          for (let i = 0, len = navPoints.length; i < len; i++) {
                            const { navLabel, content, navPoint } = navPoints[i]
                            const href = content.src.split('#')[0]
                            const id = manifestMap[href]
                            if (infomation.spine.includes(id) && !had.includes(href)) {
                              let navData = {
                                id,
                                navLabel: navLabel.text,
                                href,
                                isSub
                              }
                              results.push(navData)
                              had.push(href)
                              if (typeof navPoint === 'object') {
                                results.push(...formatNav(navPoint, true, had))
                              }
                            }
                          }
                          return results
                        }
                        try {
                          nav = formatNav(fxp.parse(data, option).ncx.navMap.navPoint)
                        } catch (err) {
                          rej([filePath, err])
                        }
                      }

                      infomation.nav = nav


                      /** 保存缓存文件 */
                      fs.writeFile(
                        path.resolve(bookPath, '.infomation'),
                        JSON.stringify(infomation),
                        (err) => {
                          if (err) { rej([filePath, '.infomation 文件保存失败']) }
                          res([filePath, hash, infomation])
                        }
                      )
                    }
                  )
              })
          })
        }
      })
    })
}

module.exports = loadEPUB