"use strict";

document.querySelectorAll("a[href").forEach((item) => {
  item.addEventListener("click", (e) => {
    e.stopPropagation();
  });
});

document.body.addEventListener("click", (e) => {
  window.retrofireAPI.closeFormAbout();
});

document.getElementById("year").innerText = new Date().getFullYear();

//------------------------------------
// メインスレッドから受信
//------------------------------------
window.retrofireAPI.onShowProcessInfo((_event, args) => {
  for (let key in args) {
    document.getElementById(key).innerText = args[key];
  }
});
