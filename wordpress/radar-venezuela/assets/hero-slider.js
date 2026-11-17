(()=>{
 const root=document.querySelector('[data-hero-places]');
 if(!root)return;
 const slides=[...root.querySelectorAll('[data-place-slide]')],dots=[...root.querySelectorAll('[data-place-dot]')],status=root.querySelector('[data-place-status]'),toggle=root.querySelector('[data-place-toggle]');
 const labels=['Salto Ángel, Canaima','Archipiélago Los Roques','Pico Bolívar, Mérida','Parque Nacional Morrocoy','La Gran Sabana'];
 let active=0,timer=null,paused=false;
 const show=index=>{
  active=(index+slides.length)%slides.length;
  slides.forEach((slide,i)=>{const current=i===active;slide.classList.toggle('is-active',current);slide.setAttribute('aria-hidden',String(!current));});
  dots.forEach((dot,i)=>i===active?dot.setAttribute('aria-current','true'):dot.removeAttribute('aria-current'));
  if(status)status.textContent=`${active+1} de ${slides.length}: ${labels[active]}`;
 };
 const stop=()=>{if(timer)window.clearInterval(timer);timer=null;};
 const start=()=>{stop();if(!paused&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches)timer=window.setInterval(()=>show(active+1),5500);};
 const move=step=>{show(active+step);start();};
 root.querySelector('[data-place-prev]')?.addEventListener('click',()=>move(-1));
 root.querySelector('[data-place-next]')?.addEventListener('click',()=>move(1));
 dots.forEach((dot,i)=>dot.addEventListener('click',()=>{show(i);start();}));
 toggle?.addEventListener('click',()=>{paused=!paused;toggle.textContent=paused?'▶':'Ⅱ';toggle.setAttribute('aria-label',paused?'Reanudar carrusel':'Pausar carrusel');paused?stop():start();});
 root.addEventListener('mouseenter',stop);root.addEventListener('mouseleave',start);
 root.addEventListener('focusin',stop);root.addEventListener('focusout',event=>{if(!root.contains(event.relatedTarget))start();});
 root.addEventListener('keydown',event=>{if(event.key==='ArrowLeft')move(-1);if(event.key==='ArrowRight')move(1);});
 document.addEventListener('visibilitychange',()=>document.hidden?stop():start());
 show(0);start();
})();
