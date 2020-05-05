/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path')
const slsw = require('serverless-webpack')
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer')
  .BundleAnalyzerPlugin
const nodeExternals = require('webpack-node-externals')

const isLocal = slsw.lib.webpack.isLocal

const plugins = []

if (slsw.lib.options.analyze) plugins.push(new BundleAnalyzerPlugin())

module.exports = {
  mode: isLocal ? 'development' : 'production',
  entry: slsw.lib.entries,
  target: 'node',
  devtool: isLocal ? 'cheap-module-source-map' : false,
  plugins,
  externals: isLocal
    ? [
        nodeExternals({
          modulesDir: path.resolve(__dirname, '../../node_modules'),
          whitelist: [/^@raptorsystems/],
        }),
      ]
    : {
        'aws-sdk': 'aws-sdk',
        // https://github.com/prisma-labs/nexus/issues/283
        prettier: 'prettier',
      },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        loader: 'ts-loader',
        options: {
          // Pevents https://github.com/prisma-labs/nexus/issues/342
          transpileOnly: true,
        },
      },
    ],
  },
  resolve: {
    extensions: [
      '.mjs', // https://github.com/graphql/graphql-js/issues/1272#issuecomment-454292053
      '.js',
      '.ts',
    ],
  },
  output: {
    libraryTarget: 'commonjs2',
    path: path.join(__dirname, '.webpack'),
    filename: '[name].js',
  },
}
