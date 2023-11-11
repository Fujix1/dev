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
}
