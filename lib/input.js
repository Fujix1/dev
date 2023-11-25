/**
 * input に IME 対応 + カット＋ペースト対応した変更イベントを追加する
 */

const inputexEvent = new Event("inputex");

document.querySelectorAll(".ime-input").forEach((input) => {
  input.addEventListener("input", (e) => {
    if (input.getAttribute("IME") !== "true") {
      input.dispatchEvent(inputexEvent);
    }
  });
  // IME 変換中
  input.addEventListener("compositionstart", (e) => {
    input.setAttribute("IME", true);
  });
  // IME 変換確定
  input.addEventListener("compositionend", (e) => {
    input.setAttribute("IME", false);
    input.dispatchEvent(inputexEvent);
  });
  // cut
  input.addEventListener("cut", (e) => {
    input.dispatchEvent(inputexEvent);
  });
  // paste
  input.addEventListener("paste", (e) => {
    input.dispatchEvent(inputexEvent);
  });
});
