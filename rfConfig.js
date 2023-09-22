//-------------------------------------------------------------------
// 定数
//-------------------------------------------------------------------
const CONSTS = {
  PATH_RESOURCES: "./resource.json",
  PATH_MAME32J: "./mame32j.lst",
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
  { title: "テスト", exePath: "d:/mame/mame.exe", workDir: "d:/mame/", option: "-mouse", optEnabled: false },
];

const rfPath = {
  dats: "./dats",
  snap: "d:\\mame\\snap\\",
};

module.exports = {
  CONSTS,
  rfConfig,
  rfProfiles,
  rfPath,
};
