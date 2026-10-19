const form=document.getElementById('eventForm');
const fields=['eventName','eventType','eventStatus','description','startDate','endDate','venueName','city','country','length','width','expectedExhibitors'];
const byId=id=>document.getElementById(id);
const fmt=v=>v?`${new Intl.NumberFormat('en-KE',{maximumFractionDigits:1}).format(v)} m²`:'—';
function update(){const l=Number(byId('length').value),w=Number(byId('width').value),a=l>0&&w>0?l*w:0;byId('grossArea').textContent=fmt(a);byId('previewArea').textContent=fmt(a);byId('ratioWidth').textContent=w?`${w} m`:'—';byId('ratioLength').textContent=l?`${l} m`:'—';byId('previewName').textContent=byId('eventName').value.trim()||'Your event';byId('previewVenue').textContent=byId('venueName').value.trim()||'Add venue dimensions';byId('previewType').textContent=byId('eventType').value||'—';byId('previewExhibitors').textContent=byId('expectedExhibitors').value||'—';}
function saveDraft(){const d={};fields.forEach(k=>d[k]=byId(k).value);localStorage.setItem('expoflow.eventDraft',JSON.stringify(d));}
function loadDraft(){try{const d=JSON.parse(localStorage.getItem('expoflow.eventDraft')||'null');if(d) fields.forEach(k=>{if(d[k]!==undefined)byId(k).value=d[k]});}catch(_){} update();}
fields.forEach(k=>{const el=byId(k);el.addEventListener('input',()=>{update();saveDraft()});el.addEventListener('change',()=>{update();saveDraft()})});
byId('startDate').addEventListener('change',()=>{byId('endDate').min=byId('startDate').value;if(byId('endDate').value&&byId('endDate').value<byId('startDate').value)byId('endDate').value=byId('startDate').value;saveDraft()});
form.addEventListener('submit',e=>{e.preventDefault();if(!form.reportValidity())return;if(byId('endDate').value<byId('startDate').value){alert('End date must be on or after the start date.');return;}const d={};fields.forEach(k=>d[k]=byId(k).value);d.createdAt=new Date().toISOString();localStorage.setItem('expoflow.currentEvent',JSON.stringify(d));localStorage.removeItem('expoflow.eventDraft');location.href='event-dashboard.html';});
loadDraft();
