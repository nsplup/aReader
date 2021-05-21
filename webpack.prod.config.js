const path = require('path')
const { merge } = require('webpack-merge')
const conf = require('./webpack.config')
const outputPath = path.resolve(__dirname, 'build/dist/prod')
const base = merge(conf, {
  output: {
    filename: '[name].js',
    path: outputPath,
  },
  optimization: {
    splitChunks: {
      name: 'vendor',
      chunks: 'all',
    },
  },
})

module.exports = [
  merge(base, {
    target: 'electron-main',
    entry: {
      main: './src/main/prod.js',
    },
  }),
  merge(base, {
    target: 'electron-renderer',
    entry: {
      renderer: './src/renderer/main.js'
    },
  })
]