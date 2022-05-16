function convertImageToDataURL (buffer, mimeType) {
  const base64 = buffer.toString('base64')

  return `data:image/${mimeType};base64,${base64}`
}

module.exports = convertImageToDataURL