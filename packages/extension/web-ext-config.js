module.exports = {
  sourceDir: './dist',
  artifactsDir: './web-ext-artifacts',
  ignoreFiles: ['*.map', '*.md'],
  build: {
    overwriteDest: true,
  },
  run: {
    startUrl: ['about:debugging#/runtime/this-firefox'],
  },
}
