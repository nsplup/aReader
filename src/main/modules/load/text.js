const _7z = require('node-7z')
const _7zbin = require('7zip')['7z']
const jschardet = require('jschardet')
const iconv = require('iconv-lite')
const path = require('path')
const fs = require('fs')

const chunkSize = 1024 * 103 /** 最大分块大小 */
const dirName = path.resolve('.', 'data')

/** 分块函数 */
function _chunk (chunks, maxSize) {
  const results = []
  let result = []
  let total = 0

  for (let i = 0, len = chunks.length; i < len; i++) {
    let chunk = chunks[i]
    let size = Buffer.from(chunk).length
    if ((total + size) > maxSize) {
      results.push(result)
      result = []
      total = 0
    }
    result.push(chunk)
    total += size
  }
  results.push(result)

  return results
}


function loadTEXT (filePath, res, rej) {
    /** 计算 SHA256 */
    _7z.hash(path.resolve(filePath), { hashMethod: 'sha256', $bin: _7zbin })
    .on('data', (data) => {
      const { hash } = data
      const bookPath = path.resolve(dirName, hash)
      const infomation = { hash }

      fs.readdir(bookPath, (err, files) => {
        /** 是否存在书籍缓存 */
        if (err) {
          fs.mkdirSync(bookPath)
          files = []
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
          try {
            const file = fs.readFileSync(path.resolve(filePath))
            /** 预测编码格式 */
            const { encoding } = jschardet.detect(file)
            /** 转码为UTF8 */
            const source = iconv.decode(file, encoding)
              .split(/[\r\n]/)
            const regExp = /^(卷\s*[0123456789一二三四五六七八九十零〇百千两壹貳叁肆伍陸柒捌玖拾佰仟]+.*|第\s*[0123456789一二三四五六七八九十零〇百千两壹貳叁肆伍陸柒捌玖拾佰仟]+\s*[章回卷节集部]+.*|[0123456789]+\s*.+)$/
            const chunks = []
            let chunk = []
            const navLabelMark = '#**镜览**#' /** 目录标记 */
  
            /** 生成目录并按照目录分块；去除文字两边空格及空白行 */
            for (let i = 0, len = source.length; i < len; i++) {
              let line = source[i].trim()
              if (line.length > 0) {
                if (regExp.test(line)) {
                  if (chunk.length > 0) {
                    chunks.push(chunk)
                    chunk = [navLabelMark]
                  }
                }
                chunk.push(line)
              }
            }
  
            chunks.push(chunk)
            chunk = null
  
            const manifest = []
            const spine = []
            const nav = []
            const content = {}
            
            for (let i = 0, len = chunks.length; i < len; i++) {
              let id = 'text-chunk-' + i
              let navLabel = ''
              let href = ''
              let isSub = false
              chunk = chunks[i]
  
              /** 获取目录标题并清除目录标记 */
              if (chunk[0] === navLabelMark) {
                navLabel = chunk[1]
                chunk = chunk.slice(1)
              }

              /** 对超过限定大小的分块进行再分块 */
              chunk = _chunk(chunk, chunkSize)
              for (let j = 0, len = chunk.length; j < len; j++) {
                let _id = `${id}-${j}`
                let filename = '.' + _id
                content[filename] = chunk[j].join('\n')

                manifest.push({
                  id: _id,
                  href: filename
                })
                spine.push(_id)
                if (j === 0 && navLabel.length > 0) {
                  nav.push({
                    id: _id,
                    navLabel,
                    href: filename,
                    isSub,
                  })
                }
              }
            }

            Object.assign(infomation, {
              title: path.basename(filePath).split('.')[0],
              format: 'TEXT',
              createdTime: Date.now(),
              manifest,
              cover: null,
              spine,
              nav,
            })

            fs.writeFile(
              path.resolve(bookPath, '.content'),
              JSON.stringify(content),
              (err) => {
                if (err) {
                  rej([filePath, '.content 文件保存失败'])
                  return
                }

                res([hash, infomation])

                /** 保存缓存文件 */
                fs.writeFile(
                  path.resolve(bookPath, '.infomation'),
                  JSON.stringify(infomation),
                  (err) => { if (err) { rej([filePath, '.infomation 文件保存失败']) } }
                )
              }
            )
          } catch (e) {
            rej([filePath, e])
          }
        }
      })
    })
}

module.exports = loadTEXT