const ExpoFlow = (() => {
  const money = (value) => value ? new Intl.NumberFormat('en-KE',{style:'currency',currency:'KES',maximumFractionDigits:0}).format(value) : '—';
  const area = (value) => value ? `${new Intl.NumberFormat('en-KE',{maximumFractionDigits:1}).format(value)} m²` : '—';
  const getEvent = () => { try { return JSON.parse(localStorage.getItem('expoflow.currentEvent') || '{}'); } catch { return {}; } };
  const setEvent = (event) => localStorage.setItem('expoflow.currentEvent', JSON.stringify(event));
  const getList = (key) => { try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; } };
  const setList = (key,list) => localStorage.setItem(key, JSON.stringify(list));
  const toast = (msg) => { const t=document.getElementById('toast'); if(!t) return; t.textContent=msg; t.classList.add('show'); clearTimeout(toast.timer); toast.timer=setTimeout(()=>t.classList.remove('show'),2400); };
  const syncSide = () => { const e=getEvent(); document.querySelectorAll('#sideEvent').forEach(el=>el.textContent=e.eventName||'Your event'); document.querySelectorAll('#sideVenue').forEach(el=>el.textContent=[e.venueName,e.city].filter(Boolean).join(' · ')||'Planning workspace'); };

  function loadDashboard(){
    const e=getEvent(), exhibitors=getList('expoflow.exhibitors'), booths=getList('expoflow.booths'), venue=e.venueSetup||{};
    document.getElementById('eventName').textContent=e.eventName||'Your event.';
    document.getElementById('crumbEvent').textContent=e.eventName||'Event overview';
    document.getElementById('eventMeta').textContent=[e.eventType,[e.startDate,e.endDate].filter(Boolean).join(' → '),e.venueName,e.city].filter(Boolean).join(' · ')||'Event details';
    const gross=Number(e.length)*Number(e.width); const reserve=Number(venue.registration||0)+Number(venue.stage||0)+Number(venue.other||0); const net=Math.max(0,gross-reserve);
    document.getElementById('grossArea').textContent=area(gross); document.getElementById('venueDimensions').textContent=(e.length&&e.width)?`${e.length} × ${e.width} m`:'Add venue dimensions';
    document.getElementById('exhibitorCount').textContent=exhibitors.length; document.getElementById('boothCount').textContent=booths.length; document.getElementById('assignedCount').textContent=booths.filter(b=>b.exhibitorId).length; document.getElementById('availableSpace').textContent=net?area(net):'—'; syncSide();
  }

  function initVenuePage(){
    const e=getEvent(), s=e.venueSetup||{}; syncSide();
    const ids=['length','width','registration','stage','other']; ids.forEach(id=>{const el=document.getElementById(id); if(el) el.value=s[id] ?? e[id] ?? '';});
    document.getElementById('eventLabel').textContent=e.venueName||'Your venue'; document.getElementById('expected').textContent=e.expectedExhibitors||'—';
    const recalc=()=>{const l=Number(length.value),w=Number(width.value),r=Number(registration.value||0)+Number(stage.value||0)+Number(other.value||0),g=l*w,n=Math.max(0,g-r);document.getElementById('gross').textContent=area(g);document.getElementById('reserve').textContent=area(r);document.getElementById('reserveSmall').textContent=area(r);document.getElementById('net').textContent=area(n);};
    ['length','width','registration','stage','other'].forEach(id=>document.getElementById(id).addEventListener('input',recalc)); recalc();
    document.getElementById('venueForm').addEventListener('submit',ev=>{ev.preventDefault();const next={...e,venueSetup:{length:length.value,width:width.value,registration:registration.value,stage:stage.value,other:other.value}}; next.length=length.value;next.width=width.value;setEvent(next);toast('Venue setup saved.');setTimeout(()=>location.href='event-dashboard.html',500);});
  }

  function initExhibitorsPage(){
    syncSide(); const modal=document.getElementById('modal'), form=document.getElementById('exhibitorForm'); const render=()=>{const list=getList('expoflow.exhibitors'),rows=document.getElementById('exhibitorRows');document.getElementById('tableHint').textContent=list.length?`${list.length} exhibitor record${list.length===1?'':'s'}.`:'No exhibitors yet.'; if(!list.length){rows.innerHTML='<tr><td colspan="6" class="empty">Add your first exhibitor to start the database.</td></tr>';return;} rows.innerHTML=list.map((x,i)=>`<tr><td><strong>${esc(x.company)}</strong></td><td>${esc(x.contact)}</td><td>${esc(x.email||'—')}</td><td>${esc(x.category||'—')}</td><td><span class="status confirmed">Registered</span></td><td><button class="small-button" data-remove="${i}">Remove</button></td></tr>`).join(''); rows.querySelectorAll('[data-remove]').forEach(btn=>btn.onclick=()=>{const arr=getList('expoflow.exhibitors');arr.splice(Number(btn.dataset.remove),1);setList('expoflow.exhibitors',arr);render();});};
    document.getElementById('addExhibitorBtn').onclick=()=>modal.classList.add('show'); document.getElementById('cancelModal').onclick=()=>modal.classList.remove('show'); document.getElementById('clearExhibitors').onclick=()=>{setList('expoflow.exhibitors',[]);render();toast('Exhibitors cleared.');}; form.addEventListener('submit',ev=>{ev.preventDefault();const fd=new FormData(form);const list=getList('expoflow.exhibitors');list.push({id:crypto.randomUUID(),company:fd.get('company'),contact:fd.get('contact'),email:fd.get('email'),category:fd.get('category')});setList('expoflow.exhibitors',list);form.reset();modal.classList.remove('show');render();toast('Exhibitor added.');}); render();
  }

  function initBoothsPage(){
    syncSide(); const modal=document.getElementById('modal'), form=document.getElementById('boothForm'); const render=()=>{const list=getList('expoflow.booths'),rows=document.getElementById('boothRows');document.getElementById('boothHint').textContent=list.length?`${list.length} booth type${list.length===1?'':'s'} defined.`:'No booth types yet.'; if(!list.length){rows.innerHTML='<tr><td colspan="6" class="empty">Create a booth type such as 3 × 3 m Standard Booth.</td></tr>';return;} rows.innerHTML=list.map((x,i)=>`<tr><td><strong>${esc(x.name)}</strong></td><td>${x.length} × ${x.width} m</td><td>${area(x.area)}</td><td>${x.price?money(x.price):'—'}</td><td>${esc(x.category||'—')}</td><td><button class="small-button" data-remove="${i}">Remove</button></td></tr>`).join(''); rows.querySelectorAll('[data-remove]').forEach(btn=>btn.onclick=()=>{const arr=getList('expoflow.booths');arr.splice(Number(btn.dataset.remove),1);setList('expoflow.booths',arr);render();});};
    document.getElementById('addBoothBtn').onclick=()=>modal.classList.add('show');document.getElementById('cancelModal').onclick=()=>modal.classList.remove('show');document.getElementById('clearBooths').onclick=()=>{setList('expoflow.booths',[]);render();toast('Booth types cleared.');};document.getElementById('seedBooths').onclick=()=>{setList('expoflow.booths',[{id:crypto.randomUUID(),name:'Standard Booth',length:3,width:3,area:9,price:40000,category:'Standard'},{id:crypto.randomUUID(),name:'Large Booth',length:6,width:3,area:18,price:75000,category:'Large'},{id:crypto.randomUUID(),name:'Premium Booth',length:9,width:3,area:27,price:110000,category:'Premium'}]);render();toast('Sample booth types loaded.');}; form.addEventListener('submit',ev=>{ev.preventDefault();const fd=new FormData(form),l=Number(fd.get('length')),w=Number(fd.get('width'));const list=getList('expoflow.booths');list.push({id:crypto.randomUUID(),name:fd.get('name'),length:l,width:w,area:l*w,price:Number(fd.get('price')||0),category:fd.get('category')});setList('expoflow.booths',list);form.reset();modal.classList.remove('show');render();toast('Booth type added.');}); render();
  }

  function loadShell(){syncSide();}
  function esc(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
  return {loadDashboard,initVenuePage,initExhibitorsPage,initBoothsPage,loadShell};
})();
