/**
 * スクショ設定
 * @param {*} zipName
 * @param {*} forceUpdate  強制更新
 */

class ScreenShot {
  constructor() {
    this.index = -1;
    this.zipName = "";
    this.width = 0;
    this.height = 0;
    this.type = "";
    this.infolder = false;
    this.config = {
      keepAspect: true,
    };
    this.keepAspect = true;
  }
  /**
   * zip名からスクリーンショット表示
   * @param {*} zipName
   */
  async show(zipName) {
    //console.log("show", zipName);
    let result;

    if (zipName === "") {
      this.clear();
      return;
    }

    const dataIndex = record.findIndex((e) => e.zipname === zipName);
    const masterId = parseInt(record[dataIndex].masterid);

    result = await window.retrofireAPI.getScreenshot(zipName);
    if (result.result) {
      this.zipName = zipName;
      this.index = dataIndex;
    }

    // 見つからない、親セットあり
    if (!result.result && masterId !== -1) {
      const masterZipName = record[masterId].zipname;
      result = await window.retrofireAPI.getScreenshot(masterZipName);
      if (result.result) {
        this.zipName = masterZipName;
        this.index = masterId;
      }
    }

    if (result.result) {
      this.width = result.width;
      this.height = result.height;
      this.type = result.type;
      this.infolder = result.infolder;
      window.requestAnimationFrame(() => {
        document.querySelector(".p-info__img").setAttribute("src", "data:image/png;base64," + result.img);
        this.setAspect();
      });
    } else {
      this.clear();
    }
    //console.log("this.infolder", this.infolder);
  }

  /**
   * クリアする
   */
  clear() {
    this.index = -1;
    this.zipName = "";
    this.width = 0;
    this.height = 0;
    this.type = "";
    this.infolder = false;
    document.querySelector(".p-info__img").removeAttribute("src");
  }

  /**
   * アスペクト比設定
   */
  setAspect() {
    if (this.index === -1) return;

    if (this.keepAspect) {
      let aspectX, aspectY;
      if (record[this.index].vertical) {
        aspectX = "3";
        aspectY = "4";
      } else {
        aspectX = "4";
        aspectY = "3";
      }

      // 特殊画面比率
      // 横3画面と2画面 (ギャップ対応)
      const OrgResX = record[this.index].resx;
      const OrgResY = record[this.index].resy;
      const NumScreens = record[this.index].numscreens;

      if (
        NumScreens === 3 &&
        this.height === OrgResX &&
        (this.width === OrgResX * 3 || this.width === OrgResX * 3 + 4)
      ) {
        aspectX = "12";
        aspectY = "3";
      } else if (
        NumScreens === 2 &&
        this.height === OrgResY &&
        (this.width === OrgResX * 2 ||
          this.width === OrgResX * 2 + 2 ||
          this.width === OrgResX * 2 + 3 ||
          this.width === OrgResX * 4 + 4)
      ) {
        aspectX = "8";
        aspectY = "3";
      } else if (
        NumScreens === 2 &&
        this.width === OrgResX &&
        (this.height === OrgResY * 2 || this.height === OrgResY * 2 + 2)
      ) {
        // 縦2画面
        aspectX = "2";
        aspectY = "3";
      } else if (NumScreens === 3 && this.width === 512 && (this.height === 704 || this.height === 368)) {
        // 対家ﾏﾇｶﾝ
        aspectX = "28";
        aspectY = "33";
      } else if (
        // 2画面横汎用
        NumScreens === 2 &&
        this.width >= 620 &&
        this.width <= 1156 &&
        this.height >= 220 &&
        this.height <= 256
      ) {
        aspectX = "8";
        aspectY = "3";
      } else if (
        // kbm
        NumScreens === 2 &&
        this.width == 772 &&
        this.height == 512
      ) {
        aspectX = "6";
        aspectY = "4";
      } else if (
        // 3画面横汎用
        NumScreens === 3 &&
        this.width >= 620 &&
        this.width <= 1156 &&
        this.height >= 220 &&
        this.height <= 256
      ) {
        aspectX = "4";
        aspectY = "1";
      } else if (NumScreens === 3 && this.width === 1544 && this.height === 384) {
        // racedrivpan
        aspectX = "12";
        aspectY = "3";
      } else if (this.width === 512 && this.height === 128) {
        // pinball
        aspectX = "4";
        aspectY = "1";
      } else if (this.width === 950 && this.height === 1243) {
        // game watch
        aspectX = "950";
        aspectY = "1243";
      } else if (this.width === 906 && this.height === 1197) {
        // game watch
        aspectX = "906";
        aspectY = "1197";
      } else if (NumScreens === 2 && this.width === 642 && this.height === 224) {
        aspectX = "8";
        aspectY = "3";
      } else if (NumScreens === 2 && this.width === 320 && this.height === 416) {
        aspectX = "4";
        aspectY = "6";
      }

      document.querySelector(".p-info__img").style.aspectRatio = aspectX + "/" + aspectY;
      if (aspectX > aspectY) {
        document.querySelector(".p-info__img").style.width = "100%";
        document.querySelector(".p-info__img").style.height = "";
      } else {
        document.querySelector(".p-info__img").style.width = "";
        document.querySelector(".p-info__img").style.height = "100%";
      }
    } else {
      document.querySelector(".p-info__img").removeAttribute("style");
    }
  }
}
