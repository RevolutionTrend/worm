# worm

环境变量 ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"

npm install
./node_modules/.bin/electron-rebuild
npx electron-forge import

首次编译，修改镜像: ./node_modules/@electron/get/dist/cjs/artifact-utils.js
const BASE_URL = 'http://npm.taobao.org/mirrors/electron/'
