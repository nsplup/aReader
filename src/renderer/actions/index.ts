import {
  GENERATE_FONTS,
  UPDATE_LIBRARY,
  UPDATE_USERCONFIG,
} from '../constants'

function generateFonts (fonts: Array<string>) {
  return { type: GENERATE_FONTS, payload: { fonts } }
}

function updateLibrary (library: Library) {
  return { type: UPDATE_LIBRARY, payload: { library } }
}

function updateUserConfig ({ userconfig, shouldSave }: { userconfig: UserConfig; shouldSave: boolean }) {
  return { type: UPDATE_USERCONFIG, payload: { userconfig }, shouldSave }
}

export {
  generateFonts,
  updateLibrary,
  updateUserConfig,
}