(function(){
  var k='tc-work-cup:theme:v1',pref='system';
  try{pref=localStorage.getItem(k)||'system';}catch(e){}
  var r=pref==='light'?'light':pref==='dark'?'dark':(window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light');
  document.documentElement.setAttribute('data-theme',r);
  document.documentElement.setAttribute('data-theme-pref',pref);
  var m=document.querySelector('meta[name=theme-color]');
  if(m)m.content=r==='dark'?'#121214':'#F5F5F7';
})();
