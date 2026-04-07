import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import CopyPlugin from 'copy-webpack-plugin';
import webpack from 'webpack';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  mode: 'development',
  devtool: 'source-map',
  entry: {
    main: './src/main.js',
    background: './src/background.js',
    options: './src/options.js',
  },
  output: {
    path: path.resolve(__dirname, 'distribution'),
    filename: '[name].js',
    clean: true,
  },
  plugins: [
    new webpack.ProvidePlugin({
      h: ['dom-chef', 'h'],
    }),
    new CopyPlugin({
      patterns: [
        {
          from: 'src/manifest.json',
          to: 'manifest.json',
        },
        {
          from: 'src/images',
          to: 'images',
        },
        {
          from: 'src/*.css',
          to: '[name][ext]',
        },
        {
          from: 'src/options.html',
          to: 'options.html',
        },
      ],
    }),
    new webpack.DefinePlugin({
      DEBUG: JSON.stringify(process.env.DEBUG === 'true'),
      KLIPY_API_KEY: JSON.stringify(process.env.KLIPY_API_KEY || ''),
    }),
  ],
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              [
                '@babel/preset-react',
                {
                  runtime: 'classic',
                  pragma: 'h',
                  pragmaFrag: 'h.Fragment',
                },
              ],
            ],
          },
        },
      },
    ],
  },
  resolve: {
    extensions: ['.js', '.jsx'],
  },
};
