/**
 * Tooltip を出すモジュール
 * <dom tooltip="string">に自動配置
 */
'use strict';
{
  const HOLDTIME = 200; // ms 
  const SCREENTHRESHOLD = 10; // px

  window.addEventListener('DOMContentLoaded', async (e) => {

    document.querySelectorAll('[tooltip]').forEach(item => {

      // tip 用 span 追加
      const span = document.createElement('span');
      span.className = 'm-tooltip';
      span.innerText = item.getAttribute('tooltip');
      item.after(span);
      
      item.addEventListener('mouseover', e=>{
        e.target.hTimeout = null;
        e.target.tipson = false;
      });

      item.addEventListener('mousemove', e=>{
        clearTimeout(e.target.hTimeout);

        if ( e.target.tipson === false ) {
          e.target.hTimeout =  setTimeout( () => {
            e.target.tipson = true;
            span.style.left = (e.pageX + 10) + "px";
            span.style.right = null;
            span.style.top = (e.pageY + 14) + "px";
            span.style.bottom = null;

            // ウインドウ外チェック
            // 右端
            const rect = span.getBoundingClientRect();

            const right = window.scrollX + rect.x + rect.width;
            if (window.innerWidth - SCREENTHRESHOLD <= right) {
              span.style.left = "unset";
              span.style.right = SCREENTHRESHOLD + "px";
            } 
            // 下端
            const bottom = window.scrollY + rect.y + rect.height;
            if (window.innerHeight - SCREENTHRESHOLD <= bottom) {
              span.style.top = "unset";
              span.style.bottom = SCREENTHRESHOLD + "px";
            }

            span.classList.add('m-tooltip--show');
          }, HOLDTIME);
        }
      })
      item.addEventListener('mouseout', e=>{
        if (e.target.tipson) {
          span.classList.remove('m-tooltip--show');
        }
        clearTimeout(e.target.hTimeout);
        e.target.tipson = false;
      });
    });

  });
}
