document.addEventListener('DOMContentLoaded',()=>{
  document.querySelectorAll('.radar-economic-tabs').forEach(tabs=>{
    const grid=tabs.nextElementSibling;
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
      });
    }));
  });
});
