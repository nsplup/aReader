// this prevents any overhead from creating the object each time
const element = document.createElement('div')

// regular expression matching HTML entities
const entity = /&(?:#x[a-f0-9]+|#[0-9]+|[a-z0-9]+)?/ig

export function decodeHTMLEntities(str: string) {
    // find and replace all the html entities
    str = str.replace(entity, fragment => {
        element.innerHTML = fragment
        return element.textContent
    })

    // reset the value
    element.textContent = ''

    return str
}