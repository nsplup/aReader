const REGEXP = /[\u0020-\u007E]/
export function getStringCount (str: string) {
  let count = 0
  for (let i = 0, len = str.length; i < len; i++) {
    if (REGEXP.test(str.charAt(i))) {
      count += 1
    } else {
      count += 2
    }
  }
  return count
}