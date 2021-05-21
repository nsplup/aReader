const path = require('path')
const { merge } = require('webpack-merge')
const conf = require('./webpack.config')
const outputPath = path.resolve(__dirname, 'build/dist/dev')
const base = merge(conf, {
  cache: true,
  output: {
    filename: '[name].js',
    path: outputPath,
  },
  devtool: 'source-map',
})

module.exports = [
  merge(base, {
    target: 'electron-main',
    entry: {
      main: './src/main/dev.js',
    },
  }),
  merge(base, {
    target: 'electron-renderer',
    entry: {
      renderer: './src/renderer/main.js'
    },
  })
]
