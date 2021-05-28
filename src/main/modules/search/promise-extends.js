function finish (promises) {
  return new Promise((res, rej) => {
    const resolve = []
    const reject = []
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

module.exports = finish