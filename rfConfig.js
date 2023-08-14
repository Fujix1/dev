//-------------------------------------------------------------------
// モジュール
//-------------------------------------------------------------------



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
  { title: 'テスト',
    exePath: 'd:/mame/mame.exe',
    workDir: 'd:/mame/',
    option: '-mouse',
    optEnabled: false,
  }
];

module.exports = {
  rfConfig,
  rfProfiles,
};
