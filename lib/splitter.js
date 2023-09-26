/**
 * Splitter
 *
 */

document.querySelectorAll(".l-splitter").forEach((item) => {
  const anchor = document.querySelector(item.getAttribute("anchor"));

  // 最大最小サイズ
  if (anchor.getAttribute("max-width")) {
    anchor.style.maxWidth = anchor.getAttribute("max-width") + "px";
  }
  if (anchor.getAttribute("min-width")) {
    anchor.style.minWidth = anchor.getAttribute("min-width") + "px";
  }
  if (anchor.getAttribute("max-height")) {
    anchor.style.maxHeight = anchor.getAttribute("max-height") + "px";
  }
  if (anchor.getAttribute("min-width")) {
    anchor.style.minWidth = anchor.getAttribute("min-height") + "px";
  }
  anchor.style.flexShrink = 0;
  anchor.style.flexGrow = 0;

  item.dragStart = {};

  // ドラッグ中
  const dragging = (e) => {
    const delta = { x: e.pageX - item.dragStart.x, y: e.pageY - item.dragStart.y };
    if (item.classList.contains("l-splitter__v")) {
      anchor.style.width = anchor.dragStartDimentions.w - delta.x + "px";
    }
  };

  // ドラッグ終了
  const dragged = (e) => {
    document.removeEventListener("mousemove", dragging);
    window.removeEventListener("mouseup", dragged);
    anchor.style.userSelect = "unset";
  };

  // ドラッグ開始
  item.addEventListener("mousedown", (e) => {
    item.dragStart = { x: e.pageX, y: e.pageY };
    anchor.dragStartDimentions = { w: anchor.offsetWidth, h: anchor.offsetHeight };
    anchor.style.userSelect = "none";
    document.addEventListener("mousemove", dragging);
    window.addEventListener("mouseup", dragged);
  });
});
