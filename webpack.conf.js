module.exports = {
  entry: ['./src/mox.js'],
  devtool: 'source-map',
  output: {
    path: './dist',
    filename: 'mox.js',
    library: 'mox',
    libraryTarget: 'umd',
    umdNamedDefine: true
  },
  module: {
    loaders: [
      {
        test: /index.js$/,
        loader: 'imports?window=>{}',
        exclude: /node_modules/
      },
      {
        test: /\.js$/,
        loader: 'babel',
        exclude: /node_modules/
      }
    ]
  }
};
