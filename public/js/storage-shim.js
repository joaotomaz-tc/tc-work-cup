if(!window.storage){
  window.storage = {
    async get(k){ try{ const v=localStorage.getItem(k); return v==null?null:{key:k,value:v}; }catch(e){ return null; } },
    async set(k,v){ try{ localStorage.setItem(k,v); }catch(e){} return {key:k,value:v}; },
    async delete(k){ try{ localStorage.removeItem(k); }catch(e){} return {key:k,deleted:true}; },
    async list(p){ let keys=[]; try{ keys=Object.keys(localStorage).filter(x=>!p||x.startsWith(p)); }catch(e){} return {keys}; }
  };
}
