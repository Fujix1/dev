/**
 * Splitter
 *
 */

document.querySelectorAll(".l-splitter").forEach((item) => {
  const anchor = document.querySelector(item.getAttribute("anchor"));
  const id = item.getAttribute("splitter-id"); // ID

  // 縦横
  if (item.classList.contains("l-splitter__v")) {
    item.vertical = true;
    anchor.style.width = "var(--splitter-" + id + "-dimension)";
  } else if (item.classList.contains("l-splitter__h")) {
    item.vertical = false;
    anchor.style.height = "var(--splitter-" + id + "-dimension)";
  }

  // アンカー伸び縮みさせない
  anchor.style.flexShrink = 0;
  anchor.style.flexGrow = 0;

  item.dragStart = {};

  const root = document.querySelector(":root");

  // ドラッグ中
  const dragging = (e) => {
    const delta = { x: e.pageX - item.dragStart.x, y: e.pageY - item.dragStart.y };
    document.body.style.cursor = "w-resize";
    item.classList.add("is-dragging");

    window.requestAnimationFrame(() => {
      if (item.classList.contains("l-splitter__v")) {
        let newWidth;
        // アンカーの前後
        if (item.previousElementSibling === anchor) {
          //手前
          newWidth = anchor.dragStartdimensions.w + delta.x;
        } else {
          newWidth = anchor.dragStartdimensions.w - delta.x;
        }
        if (newWidth >= 0) {
          root.style.setProperty("--splitter-" + id + "-dimension", newWidth + "px");
        }
      } else if (item.classList.contains("l-splitter__h")) {
        document.body.style.cursor = "s-resize";
        let newHeight;
        // アンカーの前後
        if (item.previousElementSibling === anchor) {
          //手前
          newHeight = anchor.dragStartdimensions.h + delta.y;
        } else {
          newHeight = anchor.dragStartdimensions.h - delta.y;
        }
        if (newHeight >= 0) {
          root.style.setProperty("--splitter-" + id + "-dimension", newHeight + "px");
        }
      }
    });
    e.stopPropagation();
    e.preventDefault();
  };

  // ドラッグ終了
  const dragged = (e) => {
    document.body.style.cursor = "unset";
    item.classList.remove("is-dragging");
    document.removeEventListener("mousemove", dragging);
    window.removeEventListener("mouseup", dragged);
    e.stopPropagation();
    e.preventDefault();
  };

  // ドラッグ開始
  item.addEventListener("mousedown", (e) => {
    item.dragStart = { x: e.pageX, y: e.pageY };
    anchor.dragStartdimensions = { w: anchor.offsetWidth, h: anchor.offsetHeight };
    document.addEventListener("mousemove", dragging);
    window.addEventListener("mouseup", dragged);
    e.stopPropagation();
    e.preventDefault();
  });
});
