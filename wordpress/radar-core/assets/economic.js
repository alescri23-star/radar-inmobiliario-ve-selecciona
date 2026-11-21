document.documentElement.classList.add('radar-news-enhanced');
document.addEventListener('DOMContentLoaded',()=>{
  document.querySelectorAll('.radar-economic-image').forEach(image=>{
    const img=image.querySelector('img');
    if(!img)return;
    const complete=()=>{image.classList.remove('is-loading');image.classList.add('is-loaded')};
    const fallback=()=>{image.classList.remove('is-loading','is-loaded');image.classList.add('is-fallback');img.hidden=true};
    img.addEventListener('load',complete,{once:true});
    img.addEventListener('error',fallback,{once:true});
    if(img.complete)(img.naturalWidth?complete:fallback)();
  });
  document.querySelectorAll('.radar-economic-card').forEach(card=>card.classList.add('is-visible'));
  const carousels=[...document.querySelectorAll('[data-radar-economic-carousel]')];
  carousels.forEach(carousel=>{
    const grid=carousel.querySelector('.radar-economic-grid');
    const dots=carousel.querySelector('[data-carousel-dots]');
    const toggle=carousel.querySelector('[data-carousel-toggle]');
    const interval=Math.max(1500,Number(carousel.dataset.interval)||2000);
    let page=0,timer,paused=false;
    const perPage=()=>matchMedia('(max-width:640px)').matches?2:(matchMedia('(max-width:1000px)').matches?4:6);
    const visible=()=>[...grid.querySelectorAll('.radar-economic-card:not([hidden])')];
    const pages=()=>Math.max(1,Math.ceil(visible().length/perPage()));
    const draw=()=>{
      page=(page+pages())%pages();
      const distance=carousel.clientWidth+20;
      grid.style.transform=`translateX(${-page*distance}px)`;
      dots.replaceChildren(...Array.from({length:pages()},(_,index)=>{
        const dot=document.createElement('button');dot.type='button';dot.ariaLabel=`Página ${index+1}`;dot.classList.toggle('is-active',index===page);dot.addEventListener('click',()=>{page=index;draw();restart()});return dot;
      }));
    };
    const stop=()=>{clearInterval(timer);timer=undefined};
    const start=()=>{stop();if(!paused&&!matchMedia('(prefers-reduced-motion: reduce)').matches&&pages()>1)timer=setInterval(()=>{page++;draw()},interval)};
    const restart=()=>{draw();start()};
    carousel.querySelector('[data-carousel-prev]').addEventListener('click',()=>{page--;restart()});
    carousel.querySelector('[data-carousel-next]').addEventListener('click',()=>{page++;restart()});
    toggle.addEventListener('click',()=>{paused=!paused;toggle.textContent=paused?'▶':'Ⅱ';toggle.ariaLabel=paused?'Reanudar carrusel':'Pausar carrusel';paused?stop():start()});
    carousel.addEventListener('focusin',stop);carousel.addEventListener('focusout',start);
    addEventListener('resize',()=>{page=0;restart()},{passive:true});
    carousel.radarRefresh=()=>{page=0;restart()};
    restart();
  });
  document.querySelectorAll('.radar-economic-tabs').forEach(tabs=>{
    const next=tabs.nextElementSibling;
    const grid=next?.classList.contains('radar-economic-carousel')?next.querySelector('.radar-economic-grid'):next;
    if(!grid||!grid.classList.contains('radar-economic-grid'))return;
    const cards=[...grid.querySelectorAll('.radar-economic-card')];
    tabs.querySelectorAll('[data-radar-economic-topic]').forEach(button=>button.addEventListener('click',()=>{
      const topic=button.dataset.radarEconomicTopic;
      tabs.querySelectorAll('button').forEach(item=>item.classList.toggle('is-active',item===button));
      cards.forEach(card=>{
        const visible=topic==='todo'||card.dataset.radarEconomicTopics.split(' ').includes(topic);
        card.hidden=!visible;
        card.className=card.className.replace(/\sactive-topic-\S+/g,'');
        if(visible&&topic!=='todo')card.classList.add(`active-topic-${topic}`);
		if(visible)card.classList.add('is-visible');
      });
      if(next?.radarRefresh)next.radarRefresh();
    }));
  });
});
