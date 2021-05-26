import {
  GENERATE_FONTS,
  UPDATA_LIBRARY,
  UPDATA_USERCONFIG,
} from '../constants'

function generateFonts (fonts: Array<string>) {
  return { type: GENERATE_FONTS, payload: { fonts } }
}

function updataLibrary (library: Library) {
  return { type: UPDATA_LIBRARY, payload: { library } }
}

function updataUserConfig (userconfig: UserConfig) {
  return { type: UPDATA_USERCONFIG, payload: { userconfig } }
}

export {
  generateFonts,
  updataLibrary,
  updataUserConfig,
}