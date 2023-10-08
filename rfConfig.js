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
    exePath: "d:\\mame\\mame.exe",
    workDir: "d:\\mame\\",
    option: "-mouse",
    optEnabled: false,
  },
];

const rfPath = {
  dats: "./dats",
  snap: "d:\\mame\\snap\\",
  cfg: "d:\\mame\\cfg",
  nvram: "d:\\mame\\nvram",
};

module.exports = {
  CONSTS,
  rfConfig,
  rfProfiles,
  rfPath,
};
