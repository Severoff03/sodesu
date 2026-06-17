/* ============================================================
   sync.js — ИЗОЛИРОВАННО: перенос прогресса (файл + код) + CSV библиотек.
   ============================================================ */
const Sync = (() => {
  const $ = id=>document.getElementById(id);
  const b64enc=s=>btoa(unescape(encodeURIComponent(s)));
  const b64dec=s=>decodeURIComponent(escape(atob(s)));
  function note(m){ if(window.toast) toast(m); else alert(m); }
  // Принять и base64-код, и «сырой» JSON. Чистим пробелы/переводы строк.
  function decodeCode(v){
    v=(v||'').trim();
    const raw=v.replace(/\s+/g,'');
    if(!raw) return null;
    // 1) пробуем как base64
    try{ const j=b64dec(raw); const o=JSON.parse(j); if(o&&typeof o==='object') return j; }catch(e){}
    // 2) пробуем как чистый JSON (вставили распакованным / содержимое файла)
    try{ const o=JSON.parse(v); if(o&&typeof o==='object') return v; }catch(e){}
    return null;
  }
  function applyJson(json){
    let o; try{ o=JSON.parse(json); }catch(e){ o=null; }
    if(!o||!o.progress) return false;
    return Store.importAll(json);
  }
  // Если есть нативный мост — даём выбрать место сохранения системным диалогом.
  function nativeSave(content, name, mime){
    try{ if(window.Android && typeof window.Android.saveFile==='function'){ window.Android.saveFile(content, name, mime); return true; } }catch(e){}
    return false;
  }
  function downloadJson(name, text){
    if(nativeSave(text, name, 'application/json')) return true;
    try{
      const b=new Blob([text],{type:'application/json;charset=utf-8'}); const u=URL.createObjectURL(b);
      const a=document.createElement('a'); a.href=u; a.download=name; document.body.appendChild(a); a.click();
      setTimeout(()=>{ URL.revokeObjectURL(u); a.remove(); },500); return true;
    }catch(e){ return false; } }
  function downloadCsv(name, text){
    if(nativeSave('﻿'+text, name, 'text/csv')) return;
    try{
      const b=new Blob(['﻿'+text],{type:'text/csv;charset=utf-8'}); const u=URL.createObjectURL(b);
      const a=document.createElement('a'); a.href=u; a.download=name; document.body.appendChild(a); a.click();
      setTimeout(()=>{ URL.revokeObjectURL(u); a.remove(); },500);
    }catch(e){ note('Не удалось сохранить файл'); } }
  function parseCsv(text){ const rows=[]; let row=[],cell='',q=false;
    for(let i=0;i<text.length;i++){ const c=text[i];
      if(q){ if(c==='"'){ if(text[i+1]==='"'){cell+='"';i++;} else q=false; } else cell+=c; }
      else { if(c==='"') q=true; else if(c===','){ row.push(cell); cell=''; } else if(c==='\n'||c==='\r'){ if(c==='\r'&&text[i+1]==='\n')i++; if(cell!==''||row.length){ row.push(cell); rows.push(row); row=[]; cell=''; } } else cell+=c; } }
    if(cell!==''||row.length){ row.push(cell); rows.push(row); } return rows; }
  function importCsv(name, text){
    try{ const rows=parseCsv(text); if(!rows.length) return false;
      let start=0; const h=rows[0].map(x=>x.toLowerCase());
      if(h.includes('type')) start=1;
      const libId=Store.addCustomLib(name||'Импорт', 'lessons');
      const gmap={}; let gn=0;
      for(let i=start;i<rows.length;i++){ const r=rows[i]; if(!r||r.length<2) continue;
        const type=(r[0]||'').trim().toLowerCase(); const groupName=(r[1]||'1').trim();
        if(!(groupName in gmap)){ gmap[groupName]=++gn; }
        const g=gmap[groupName]; const kanji=(r[2]||'').trim(), kana=(r[3]||'').trim(), tr=(r[4]||'').trim(), pat=(r[5]||'').trim();
        if(type==='kanji') Store.addCustomItem(libId,'kanji',{c:kanji,m:tr},g,groupName);
        else if(type==='grammar') Store.addCustomItem(libId,'grammar',{t:kanji,p:pat,m:tr},g,groupName);
        else Store.addCustomItem(libId,'words',{j:kanji,k:kana,r:tr,e:''},g,groupName);
      }
      return true;
    }catch(e){ return false; }
  }
  function init(){
    // Резервная копия прогресса файлом (перенос/восстановление).
    if($('syncExportFile')) $('syncExportFile').onclick=()=>{
      const stamp=new Date().toISOString().slice(0,10);
      const ok=downloadJson('sodesu-progress-'+stamp+'.json', Store.exportAll());
      // При нативном сохранении уведомление покажет система после выбора места.
      if(!(window.Android&&window.Android.saveFile)){ note(ok?'Файл сохранён':'Не удалось сохранить файл'); } };
    if($('syncImportFile')) $('syncImportFile').onchange=e=>{ const f=e.target.files&&e.target.files[0]; if(!f) return;
      const r=new FileReader(); r.onload=()=>{ const json=decodeCode(String(r.result||''));
        if(!json){ note('Файл не распознан'); e.target.value=''; return; }
        if(applyJson(json)){ note('Прогресс восстановлен ✓'); setTimeout(()=>location.reload(),400); } else note('Не удалось применить файл');
        e.target.value=''; };
      r.readAsText(f); };
  }
  return { init, downloadCsv, importCsv, downloadJson };
})();
window.Sync = Sync;
