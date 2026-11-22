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
  document.querySelectorAll('[data-radar-market-visual]').forEach(visual=>{
    const scenes=[...visual.querySelectorAll('[data-market-scene]')];
    const dots=[...visual.querySelectorAll('[data-market-dot]')];
    const toggle=visual.querySelector('[data-market-toggle]');
    const interval=Math.max(4000,Number(visual.dataset.interval)||6000);
    let current=0,timer,paused=false;
    const show=index=>{
      current=(index+scenes.length)%scenes.length;
      scenes.forEach((scene,i)=>{const active=i===current;scene.classList.toggle('is-active',active);scene.setAttribute('aria-hidden',active?'false':'true')});
      dots.forEach((dot,i)=>dot.classList.toggle('is-active',i===current));
    };
    const stop=()=>{clearInterval(timer);timer=undefined};
    const start=()=>{stop();if(!paused&&scenes.length>1&&!matchMedia('(prefers-reduced-motion: reduce)').matches)timer=setInterval(()=>show(current+1),interval)};
    visual.querySelector('[data-market-prev]')?.addEventListener('click',()=>{show(current-1);start()});
    visual.querySelector('[data-market-next]')?.addEventListener('click',()=>{show(current+1);start()});
    dots.forEach(dot=>dot.addEventListener('click',()=>{show(Number(dot.dataset.marketDot));start()}));
    toggle?.addEventListener('click',()=>{paused=!paused;toggle.textContent=paused?'▶':'Ⅱ';toggle.ariaLabel=paused?'Reanudar escenas':'Pausar escenas';paused?stop():start()});
    visual.addEventListener('mouseenter',stop);visual.addEventListener('mouseleave',start);
    visual.addEventListener('focusin',stop);visual.addEventListener('focusout',start);
    show(0);start();
  });
  const carousels=[...document.querySelectorAll('[data-radar-economic-carousel]')];
  carousels.forEach(carousel=>{
    const grid=carousel.querySelector('.radar-economic-grid');
    const cards=[...grid.querySelectorAll('.radar-economic-card')];
    const status=carousel.querySelector('[data-carousel-status]');
    const toggle=carousel.querySelector('[data-carousel-toggle]');
    const interval=Math.max(1500,Number(carousel.dataset.interval)||2000);
    let timer,paused=false,cursor=0,slot=0,active=[];
    const slotCount=()=>matchMedia('(max-width:640px)').matches?2:(matchMedia('(max-width:1000px)').matches?4:6);
    const pool=()=>cards.filter(card=>card.dataset.filterMatch!=='false');
    const area=index=>{const columns=slotCount()===6?3:(slotCount()===4?2:1);return `${Math.floor(index/columns)+1} / ${index%columns+1}`};
    const updateStatus=()=>{const count=pool().length;status.textContent=count?`${Math.min(cursor||count,count)} de ${count} noticias`:''};
    const reveal=(card,index)=>{
      card.hidden=false;card.style.gridArea=area(index);card.classList.remove('is-switching');
      requestAnimationFrame(()=>card.classList.add('is-switching'));
    };
    const reset=()=>{
      const available=pool();cards.forEach(card=>{card.hidden=true;card.style.gridArea=''});
      active=available.slice(0,slotCount());active.forEach(reveal);cursor=active.length%Math.max(1,available.length);slot=0;updateStatus();
    };
    const advance=(direction=1)=>{
      const available=pool();if(available.length<=slotCount())return;
      if(direction<0)cursor=(cursor-2+available.length)%available.length;
      const incoming=available[cursor%available.length];const position=slot%slotCount();const outgoing=active[position];
      if(outgoing&&outgoing!==incoming)outgoing.hidden=true;
      active[position]=incoming;reveal(incoming,position);cursor=(cursor+1)%available.length;slot=(slot+1)%slotCount();updateStatus();
    };
    const stop=()=>{clearInterval(timer);timer=undefined};
    const start=()=>{stop();if(!paused&&!matchMedia('(prefers-reduced-motion: reduce)').matches&&pool().length>slotCount())timer=setInterval(advance,interval)};
    const restart=()=>{reset();start()};
    carousel.querySelector('[data-carousel-prev]').addEventListener('click',()=>{advance(-1);start()});
    carousel.querySelector('[data-carousel-next]').addEventListener('click',()=>{advance(1);start()});
    toggle.addEventListener('click',()=>{paused=!paused;toggle.textContent=paused?'▶':'Ⅱ';toggle.ariaLabel=paused?'Reanudar carrusel':'Pausar carrusel';paused?stop():start()});
    carousel.addEventListener('focusin',stop);carousel.addEventListener('focusout',start);
    addEventListener('resize',restart,{passive:true});
    carousel.radarRefresh=restart;
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
        card.dataset.filterMatch=visible?'true':'false';
        card.hidden=!visible;
        card.setAttribute('aria-hidden',visible?'false':'true');
        card.className=card.className.replace(/\sactive-topic-\S+/g,'');
        if(visible&&topic!=='todo')card.classList.add(`active-topic-${topic}`);
		card.classList.toggle('is-visible',visible);
      });
      if(next?.radarRefresh)next.radarRefresh();
    }));
  });
});
