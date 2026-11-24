/* Rotta Canonica: optional, progressive, reduced-motion-aware presentation only.
   Does not write to localStorage, call APIs or modify episode data. */
(()=>{
  'use strict';
  const root=document.getElementById('app');
  if(!root||!('IntersectionObserver' in window)||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const observer=new IntersectionObserver(entries=>{
    for(const entry of entries){
      if(entry.isIntersecting){entry.target.classList.add('v11-visible');observer.unobserve(entry.target)}
    }
  },{rootMargin:'0px 0px 35px 0px',threshold:0.03});
  let scheduled=false;
  const scan=()=>{
    scheduled=false;
    const items=root.querySelectorAll('.section-header,.character-section .char-card,.arc-card,.tool-tile,.achievement-card,.paper-panel');
    // Avoid large deferred render queues on huge lists.
    for(const element of items){
      if(element.classList.contains('v11-reveal'))continue;
      const rect=element.getBoundingClientRect();
      element.classList.add('v11-reveal');
      if(rect.top<window.innerHeight+35&&rect.bottom>0){element.classList.add('v11-visible')}
      else{observer.observe(element)}
    }
  };
  const schedule=()=>{if(!scheduled){scheduled=true;requestAnimationFrame(scan)}};
  document.documentElement.classList.add('v11-motion');
  const mutations=new MutationObserver(schedule);
  mutations.observe(root,{childList:true,subtree:false});
  schedule();
  window.addEventListener('pageshow',schedule,{passive:true});
})();
