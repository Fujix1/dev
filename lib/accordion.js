/**
 * アコーディオンの処理
 */
document.addEventListener("DOMContentLoaded", (e) => {
  const accordions = document.querySelectorAll(".m-accordion");
  accordions.forEach((item) => {
    const input = item.querySelector(".m-accordion__input");
    const id = input.id;
    const content = item.querySelector(".m-accordion__content");
    content.style.maxHeight = "var(--accordion-" + id + "-height)";
  });

  setAccordionMaxHeight();
});

// 各アコーディオンのコンテンツ高さ設定
function setAccordionMaxHeight() {
  const root = document.querySelector(":root");
  const accordions = document.querySelectorAll(".m-accordion");
  accordions.forEach((item) => {
    const input = item.querySelector(".m-accordion__input");
    const id = input.id;
    //const content = item.querySelector(".m-accordion__content");
    const height = item.querySelector(".m-accordion__inner").clientHeight;
    root.style.setProperty("--accordion-" + id + "-height", height + "px");
  });
}
