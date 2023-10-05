const path = require("node:path");

//-------------------------------------------------------------------
// 定数
//-------------------------------------------------------------------
const CONSTS = {
  PATH_RESOURCES: path.join(__dirname, "resource.json"),
  PATH_MAME32J: path.join(__dirname, "mame32j.lst"),
};

//-------------------------------------------------------------------
// 状態管理と変数
//-------------------------------------------------------------------
const rfConfig = {
  currentProfile: 0, // 現在選択中のプロファイル番号
};

/**
 * プロファイル
    Title   : string;
    ExePath : string;
    WorkDir : string;
    Option  : string;
    OptEnbld: boolean;
 *
 */

const rfProfiles = [
  {
    title: "テスト",
    exePath: "C:\\Users\\tfuji\\Desktop\\mame\\mame.exe",
    workDir: "C:\\Users\\tfuji\\Desktop\\mame\\",
    option: "-mouse",
    optEnabled: false,
  },
];

const rfPath = {
  dats: "./dats",
  snap: "C:\\Users\\tfuji\\Desktop\\mame\\snap\\",
};

module.exports = {
  CONSTS,
  rfConfig,
  rfProfiles,
  rfPath,
};
