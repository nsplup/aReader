import { GENERATE_FONTS } from '../constants'

function generateFonts (fonts: Array<string>) {
  return { type: GENERATE_FONTS, payload: { fonts } }
}

export {
  generateFonts
}