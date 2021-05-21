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
  devServer: {
    compress: true,
    port: 8080,
    hot: true
  },
})

module.exports = [
  merge(base, {
    target: 'electron-main',
    entry: {
      main: './src/main/dev.js',
    },
  }),
  merge(base, {
    target: 'web',
    entry: {
      renderer: './src/renderer/main.js'
    },
  })
]
