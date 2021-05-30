const path = require('path')
const { merge } = require('webpack-merge')
const conf = require('./webpack.config')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const TerserPlugin = require('terser-webpack-plugin')
const outputPath = path.resolve(__dirname, 'build/dist/prod')
const base = merge(conf, {
  output: {
    filename: '[name].js',
    path: outputPath,
  },
  optimization: {
    minimize: true,
    minimizer: [new TerserPlugin({ parallel: 4 })],
    sideEffects: false,
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
    plugins: [
      new HtmlWebpackPlugin({
        template: './src/static/index.html',
      }),
    ]
  }),
  merge(base, {
    target: 'node',
    entry: {
      loadProcess: './src/main/modules/load/index.js'
    },
  }),
  merge(base, {
    target: 'node',
    entry: {
      searchProcess: './src/main/modules/search/index.js'
    },
  })
]