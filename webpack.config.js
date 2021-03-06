const path = require('path')
const { HotModuleReplacementPlugin } = require('webpack')

module.exports = {
  entry: {
    vendor: [
      'react',
      'react-dom',
      'react-redux',
    ],
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/i,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', '@babel/preset-react']
          }
        }
      },
      {
        test: /\.tsx?$/i,
        exclude: /node_modules/,
        use: 'ts-loader',
      },
      {
        test: /\.(s[ac]ss|css)$/i,
        use: [
          { loader: 'style-loader' },
          // {
          //   loader: 'px2-loader',
          //   options: {
          //     datum: 480
          //   }
          // },
          { loader: 'css-loader', options: { importLoaders: 2 } },
          { loader: 'postcss-loader', options: { plugins: [require('autoprefixer')] } },
          { loader: 'sass-loader' }
        ]
      },
      {
        test: /\.(png|svg|jpg|gif|webp|bmp)$/i,
        use: {
          loader: 'file-loader',
          options: {
            name: '[name].[hash:6].[ext]',
            outputPath: 'img'
          }
        }
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/i,
        use: {
          loader: 'file-loader',
          options: {
            name: '[name].[ext]',
            outputPath: 'fonts'
          }
        }
      }
    ]
  },
  plugins: [
    new HotModuleReplacementPlugin()
  ],
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
    alias: {
      '@': path.resolve(__dirname, './src/main'),
      '@renderer': path.resolve(__dirname, './src/renderer'),
      '@static': path.resolve(__dirname, './src/static'),
      '@constants': path.resolve(__dirname, './src/constants'),
      '@utils': path.resolve(__dirname, './src/utils'),
    }
  },
}
