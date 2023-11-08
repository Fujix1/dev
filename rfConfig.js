const path = require("node:path");

//-------------------------------------------------------------------
// 定数
//-------------------------------------------------------------------
const CONSTS = {
  PATH_RESOURCES: path.join(__dirname, "resource.json"),
  PATH_MAME32J: path.join(__dirname, "mame32j.lst"),
  PATH_SOFTLISTS: path.join(__dirname, "softlist.json"),
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

const softlistTitleJ = [
  { from: "Nintendo Entertainment System cartridges", to: "任天堂ファミリーコンピュータカセット" },
  { from: "Nintendo Entertainment System", to: "任天堂ファミリーコンピュータ" },
  { from: "Nintendo SNES cartridges", to: "任天堂スーパーファミコンカセット" },
  { from: "Nintendo SNES - Sufami Turbo cartridges", to: "任天堂スーパーファミコン - スーファミターボカセット" },
  { from: "Nintendo SNES Satellaview Memory Packs", to: "任天堂スーパーファミコンサテラビューメモリパック" },
  { from: "Nintendo Virtual Boy cartridges", to: "任天堂バーチャルボーイカセット" },
  {
    from: "Nintendo Entertainment System - Datach Joint ROM System mini-cartridges",
    to: "任天堂ファミリーコンピュータ - データックジョイントROMシステムミニカセット",
  },
  {
    from: "Nintendo FamicomBox cartridges",
    to: "任天堂ファミコンボックスカセット",
  },

  { from: "Nantettatte!! Baseball mini-cartridges", to: "なんてったってベースボール ミニカセット" },
  { from: "Karaoke Studio expansion cartridges", to: "カラオケスタジオ拡張カセット" },

  { from: "Nintendo Famicom Family BASIC cassettes", to: "任天堂ファミリーベーシックテープ" },
  { from: "Nintendo Famicom Disk images", to: "任天堂ファミコンディスクシステムイメージ" },
  { from: "Nintendo Game Boy cartridges", to: "任天堂ゲームボーイカセット" },
  { from: "Nintendo Game Boy Color cartridges", to: "任天堂ゲームボーイカラーカセット" },
  { from: "Nintendo Game Boy Advance cartridges", to: "任天堂ゲームボーイアドバンスカセット" },
  { from: "Sega Dreamcast GD-ROMs", to: "セガドリームキャストGD-ROM" },
  { from: "Sega Game Gear cartridges", to: "セガゲームギアカセット" },
  { from: "Sega Saturn cartridges", to: "セガサターンカセット" },
  { from: "Sega Saturn CD-ROM", to: "セガサターンCD-ROM" },
  { from: "Sega Mega CD (Euro) CD-ROMs", to: "セガメガCD (Euro版) CD-ROM" },
  { from: "Sega Mega CD (Jpn) CD-ROMs", to: "セガメガCD (日本版) CD-ROM" },
  { from: "Sega MegaDrive/Genesis cartridges", to: "セガメガドライブ/Genesisカセット" },
  { from: "Sega Master System cartridges", to: "セガマスターシステムカセット" },
  { from: "Sega SG-1000 and SG-1000 Mark II cartridges", to: "セガSG-1000/SG-1000 Mark IIカセット" },

  { from: "Sony Playstation CD-ROMs", to: "ソニープレイステーションCD-ROM" },
  { from: "Fujitsu FM-7 cassettes", to: "富士通FM-7カセットテープ" },
  { from: "Fujitsu FM-7 disk images", to: "富士通FM-7ディスク" },
  { from: "Fujitsu FM-77AV disk images", to: "富士通FM-77AVディスク" },
  { from: "Fujitsu FM Towns CD-ROMs", to: "富士通FM TOWNS CD-ROM" },
  { from: "Fujitsu FM Towns cracked floppy disk images", to: "富士通FM TOWNSフロッピーディスク(クラック済み)" },
  { from: "Fujitsu FM Towns miscellaneous floppy disk images", to: "富士通FM TOWNSフロッピーディスク(その他)" },
  { from: "Fujitsu FM Towns original floppy disk images", to: "富士通FM TOWNSフロッピーディスク(オリジナル)" },
  { from: "SNK NeoGeo CD CD-ROMs", to: "SNKネオジオCD CD-ROM" },
  { from: "SNK Neo-Geo cartridges", to: "SNKネオジオカセット" },
  { from: "SNK Neo Geo Pocket cartridges", to: "SNKネオジオポケットカセット" },
  { from: "SNK Neo Geo Pocket Color cartridges", to: "SNKネオジオポケットカラーカセット" },

  { from: "Sharp X68k disk images", to: "シャープX68000ディスク" },
  { from: "Sharp MZ-2200 cassettes", to: "シャープMZ-2200カセットテープ" },
  { from: "Sharp MZ-700 cassettes", to: "シャープMZ-700カセットテープ" },
  { from: "Sharp MZ-800 cassettes", to: "シャープMZ-800カセットテープ" },
  { from: "Sharp X1 cassettes", to: "シャープX1カセットテープ" },
  { from: "Sharp X1 disk images", to: "シャープX1ディスク" },

  { from: "NEC PC Engine / Turbografx-16 CD-ROM", to: "NEC PCエンジン / Turbografx 16 CD-ROM" },
  { from: "NEC PC-Engine HuCards", to: "NEC PCエンジン Huカード" },
  { from: "Takara Jumping Popira", to: "タカラジャンピンポピラ" },
  { from: "Takara ", to: "タカラ" },
  { form: "Gachinko Shōbu! PachisloTV cartridges", to: "ガチンコ勝負！パチスロTVカセット" },

  { from: "CD-ROMs", to: "CD-ROM" },
  { from: "ROMs", to: "ROM" },
  { from: "tapes/cartridges", to: "テープ/カセット" },
  { from: "cassettes", to: "カセットテープ" },
  { from: "disk images", to: "ディスク" },
  { from: "Disk Images", to: "ディスク" },
  { from: "hard disks", to: "ハードディスク" },
  { from: "floppy disks", to: "フロッピー" },
  { from: "floppy images", to: "フロッピー" },
  { from: "ROM images", to: "ROMイメージ" },
  { from: "diskettes", to: "ディスク" },
  { from: "cartridges", to: "カセット" },
  { from: "floppy disk images", to: "フロッピー" },
  { from: "discs", to: "ディスク" },
  { from: "disks", to: "ディスク" },
  { from: "Disks", to: "ディスク" },
  { from: "floppies", to: "フロッピー" },
];

module.exports = {
  CONSTS,
  rfConfig,
  rfProfiles,
  rfPath,
  softlistTitleJ,
};
