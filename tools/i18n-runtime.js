// תרגום הממשק לאנגלית: כל טקסט עברי שמוצג על המסך מוחלף לפי המילון (i18n/en.json).
// {x} במילון = ערך משתנה (מספר, שם, אייקון). שמות שחקנים, צ'אט ומילים שהמשתמשים כתבו לא מתורגמים (data-notr).
(function(){
  var D=window.I18N_EN_DICT||{},EX=new Map(),PAT=[],HE=/[א-ת]/,cache=new Map();
  function esc(s){return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}
  Object.keys(D).forEach(function(k){if(k.indexOf('{x}')<0)EX.set(k,D[k]);else PAT.push({re:new RegExp('^\\s*'+k.split('{x}').map(function(x){return esc(x.trim());}).join('\\s*([\\s\\S]*?)\\s*')+'\\s*$'),v:D[k],lit:k.replace(/\{x\}/g,'').length});});
  PAT.sort(function(a,b){return b.lit-a.lit;});
  function core(t){if(cache.has(t))return cache.get(t);var r=EX.get(t);
    if(r==null){for(var i=0;i<PAT.length;i++){var m=t.match(PAT[i].re);if(m){var j=1;r=PAT[i].v.replace(/\{x\}/g,function(){var g=m[j++]||'';return HE.test(g)?core(g.trim()):g;}).replace(/\s{2,}/g,' ').trim();break;}}}
    if(r==null){var m2=t.match(/^([\s\S]*?)([:.!?…]+)$/);if(m2&&EX.has(m2[1]))r=EX.get(m2[1])+m2[2];}
    if(r==null)r=t;cache.set(t,r);return r;}
  function tr(s){if(s==null)return s;s=String(s);if(!HE.test(s))return s;var t=s.replace(/\s+/g,' ').trim();var r=core(t);if(r===t)return s;return (/^\s/.test(s)?' ':'')+r+(/\s$/.test(s)?' ':'');}
  var ATTR=['placeholder','title','aria-label','alt'];
  function skip(el){return !!(el&&el.closest&&el.closest('[data-notr],script,style,textarea'));}
  function walk(root){if(!root)return;if(root.nodeType===3){if(HE.test(root.data)&&!skip(root.parentElement)){var n=tr(root.data);if(n!==root.data)root.data=n;}return;}
    if(root.nodeType!==1&&root.nodeType!==11)return;if(root.nodeType===1&&skip(root))return;
    var els=root.nodeType===1?[root].concat([].slice.call(root.querySelectorAll('*'))):[].slice.call(root.querySelectorAll('*'));
    els.forEach(function(el){for(var a=0;a<ATTR.length;a++){var v=el.getAttribute(ATTR[a]);if(v&&HE.test(v)&&!skip(el)){var n=tr(v);if(n!==v)el.setAttribute(ATTR[a],n);}}});
    var w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,null),x;var list=[];while((x=w.nextNode()))list.push(x);
    list.forEach(function(t){if(HE.test(t.data)&&!skip(t.parentElement)){var n=tr(t.data);if(n!==t.data)t.data=n;}});}
  window.I18N_TR=tr;window.I18N_WALK=walk;
  function start(){walk(document.body);document.title=tr(document.title);
    new MutationObserver(function(ms){ms.forEach(function(m){if(m.type==='characterData')walk(m.target);else if(m.type==='attributes')walk(m.target);else m.addedNodes.forEach(walk);});})
      .observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:ATTR});}
  if(document.body)start();else document.addEventListener('DOMContentLoaded',start);
})();
