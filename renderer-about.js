"use strict";

window.addEventListener("DOMContentLoaded", async () => {
  document.querySelectorAll("a[href").forEach((item) => {
    item.addEventListener("click", (e) => {
      e.stopPropagation();
    });
  });

  document.body.addEventListener("click", (e) => {
    window.retrofireAPI.closeFormAbout();
  });
  document.getElementById("year").innerText = new Date().getFullYear();
  const info = await window.retrofireAPI.getProcessInfo();
  for (let key in info) {
    document.getElementById(key).innerText = info[key];
  }
});
