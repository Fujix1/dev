/**
 * dats クラス
 */

class Dats {
  constructor() {
    this.mameinfo = {};
    this.history = {};
  }

  async init() {
    var tick = Date.now();

    this.mameinfo = {};
    this.history = {};

    // mameinfo.dat読み込み
    let fileContents = await window.retrofireAPI.getMameInfo();
    if (fileContents) {
      let info = "";
      let st = "";

      fileContents.split(/\r?\n/).forEach((line) => {
        if (line.startsWith("$info=")) {
          info = line.substr(6).split(",");
        } else if (line.startsWith("$mame")) {
          st = "";
        } else if (line.startsWith("$end")) {
          st = st.replace(/\n\n\n/g, "<br><br>");
          st = st.replace(/\n\n/g, "<br>");
          info.forEach((item) => {
            this.mameinfo[String(item).trim()] = st;
          });
        } else {
          st += line + "\n";
        }
      });
    }
    fileContents = "";

    // history.dat読み込み
    fileContents = await window.retrofireAPI.getHistory();
    if (fileContents) {
      let info = [];
      let st = "";

      fileContents.split(/\r?\n/).forEach((line) => {
        if (line.startsWith("$info=")) {
          info = line.substr(6).split(",");
        } else if (line.startsWith("$bio")) {
          st = "";
        } else if (line.startsWith("$end")) {
          st = st.replace(/\n/g, "<br>");
          info.forEach((item) => {
            this.history[String(item).trim()] = st;
          });
        } else {
          st += line + "\n";
        }
      });
    }

    console.log("Dats init:", Date.now() - tick, "ms");
  }

  async getInfo(zipName) {
    const index = Dataset.indexOfZip(zipName);
    const masterId = Dataset.master[index].masterid;
    let masterZip = "";

    let st = "";

    if (masterId !== -1) {
      masterZip = Dataset.master[masterId].zipname;
    }

    if (this.history.hasOwnProperty(zipName)) {
      st += this.history[zipName];
    } else {
      // クローンのときは親を見る
      if (masterId !== -1 && this.history.hasOwnProperty(masterZip)) {
        st += this.history[masterZip];
      }
    }
    if (st !== "") {
      st += "<br>";
    }

    if (this.mameinfo.hasOwnProperty(zipName)) {
      st += this.mameinfo[zipName];
    } else {
      // クローンのときは親を見る
      if (masterId !== -1 && this.mameinfo.hasOwnProperty(masterZip)) {
        st += this.mameinfo[masterZip];
      }
    }
    return st;
  }

  //---------------------------------------------------------------------------------------
  // Static関数

  /**
   * mame32jを返す
   * @returns []
   */
  static makeMame32j() {
    const mame32j = [];
    for (let i = 0; i < Dataset.master.length; i++) {
      if (Dataset.master[i].desc !== Dataset.master[i].descJ || Dataset.master[i].desc !== Dataset.master[i].kana) {
        mame32j.push(
          Dataset.master[i].zipname + "\t" + Dataset.master[i].descJ.trim() + "\t" + Dataset.master[i].kana.trim()
        );
      }
    }
    return mame32j;
  }

  /**
   * DATとコマンド表示
   * @param {*} zipName
   */
  static async showInfo(zipName) {
    // gameinfo 部分
    if (zipName === "") {
      currentRow = null;
      document.querySelector("#info").innerHTML = "";

      const desc = document.getElementById("editDescription");
      const descj = document.getElementById("editDescriptionJ");
      const kana = document.getElementById("editKana");
      desc.value = "";
      descj.value = "";
      kana.value = "";
      desc.disabled = true;
      descj.disabled = true;
      kana.disabled = true;
      checkTranslated();

      document.getElementById("gameinfo--zip").value = "";
      document.getElementById("gameinfo--cpu").value = "";
      document.getElementById("gameinfo--sound").value = "";
      document.getElementById("gameinfo--display").value = "";
      document.getElementById("gameinfo--driver").value = "";
      document.getElementById("footer--desc").innerText = "";
    } else {
      const st = await dats.getInfo(zipName);
      document.querySelector("#info").innerHTML = st;

      const row = Dataset.getRowByZip(zipName);
      currentRow = row;
      const desc = document.getElementById("editDescription");
      const descj = document.getElementById("editDescriptionJ");
      const kana = document.getElementById("editKana");
      desc.value = row.desc;
      descj.value = row.descJ;
      kana.value = row.kana;
      clearUndo(desc);
      clearUndo(descj);
      clearUndo(kana);
      desc.disabled = false;
      descj.disabled = false;
      kana.disabled = false;
      checkTranslated();

      document.getElementById("gameinfo--zip").value = zipName;
      document.getElementById("gameinfo--cpu").value = row.cpus.replaceAll("<br>", "\n");
      document.getElementById("gameinfo--sound").value = row.sounds.replaceAll("<br>", "\n");
      document.getElementById("gameinfo--display").value = row.screens.replaceAll("<br>", "\n");
      document.getElementById("gameinfo--driver").value = row.source;
      document.getElementById("footer--desc").innerText = row.desc;
    }
  }
}
