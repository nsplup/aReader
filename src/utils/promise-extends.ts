interface Results<T> {
  resolve: Array<T>
  reject: Array<any>
}

function finish<T> (promises: Array<Promise<T>>): Promise<Results<T>> {
  return new Promise((res, rej) => {
    const resolve: Array<T> = []
    const reject: Array<any> = []
    let finished = 0

    promises.forEach(promise => {
      promise
        .then(res => resolve.push(res))
        .catch(res => reject.push(res))
        .finally(() => {
          finished += 1
          if (finished === promises.length) {
            res({ resolve, reject })
          }
        })
    })
  })
}


const _Promise = {
  finish
}

export { _Promise }