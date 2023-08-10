
/**
 * Retrofire Configs
 */
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
    workDir: 'd:/mame',
    option: '-mouse',
    optEnabled: false,
  }
];


/**
 * MAME 起動処理
 * @param {{ zipName: string, softName: string }}
 * @return { string }
 */
const child_process = require('child_process');
const rfExecuteMAME = async(event, ...args) => {
  
  // プロファイル未選択時
  if (rfConfig.currentProfile == -1) {
    return "rfExecuteMAME(): No Profile Set."
  }

  let mameArgs = [args[0].zipName];

  // ソフト選択時
  if (args[0].softName !== undefined) {
    mameArgs.push(args[0].softName);
  }
  // オプション
  if (rfProfiles[rfConfig.currentProfile].optEnabled) {
    mameArgs.push(rfProfiles[rfConfig.currentProfile].option);
  }

  // 起動処理
  child_process.execFile( 
    rfProfiles[rfConfig.currentProfile].exePath,
    mameArgs, 
  { cwd: rfProfiles[rfConfig.currentProfile].workDir }, 
    (err, stdout, stderr)=>{
    if (err) {
      console.log(err);
    }
    console.log(stdout);
  });
  return 'return from rfExecuteMAME()';

};


module.exports = {rfExecuteMAME, rfProfiles};
