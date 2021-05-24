const MIMEMAP: any = {
  '504B34': 'epub',
  '424D': 'bmp',
  '474946': 'gif',
  'FFD8FF': 'jpg',
  '89504E': 'png',
  '524946': 'webp'
}

function getSignature (buffer: Buffer) {
  const signature = [... new Array(4).keys()]
    .map(n => buffer[n].toString(16))
    .join('')

  return signature.toLocaleUpperCase()
}

function convertSignature (signature: string) {
  const MAP = Object.keys(MIMEMAP)
  for (let i = 0, len = MAP.length; i < len; i++) {
    const HEAD = MAP[i]
    if (signature.indexOf(HEAD) >= 0) {
      return MIMEMAP[HEAD]
    }
  }
  return undefined
}

function getFileMimeType (buffer: Buffer) {
  return convertSignature(getSignature(buffer))
}

export { getFileMimeType }