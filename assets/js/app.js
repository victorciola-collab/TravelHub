(() => {
  const data = window.TRAVEL_DATA;
  const taskRoot = document.querySelector('#tasks-list');
  const clone = value => JSON.parse(JSON.stringify(value));
  const itineraryOps = data.itineraryOps;
  if (!Array.isArray(data.hotels) || !data.trip || !Array.isArray(data.trip.flights) || !Array.isArray(data.trip.passengers) || !Array.isArray(data.places) || !Array.isArray(data.itinerary) || !Array.isArray(data.tasks) || !itineraryOps?.days) {
    throw new Error('[TravelHub] TRAVEL_DATA em data.js está incompleto ou inválido.');
  }
  const placesById = new Map();
  function rebuildPlacesById() {
    placesById.clear();
    data.places.forEach(place => {
      if (placesById.has(place.id)) console.error(`[TravelHub] ID de Local duplicado: ${place.id}`, placesById.get(place.id), place);
      else placesById.set(place.id, place);
    });
  }
  function validateTravelData() {
    const errors=[];
    const placeIds=new Set(),dayIds=new Set(),hotelIds=new Set(),activityIds=new Set();
    data.hotels.forEach((hotel,index)=>{
      if(typeof hotel.id!=='string'||!hotel.id.trim())errors.push(`Hotel na posição ${index} sem ID obrigatório.`);
      else if(hotelIds.has(hotel.id))errors.push(`ID de hotel duplicado: ${hotel.id}.`);
      else hotelIds.add(hotel.id);
    });
    data.places.forEach((place,index)=>{
      if(typeof place.id!=='string'||!place.id.trim())errors.push(`Local na posição ${index} sem ID obrigatório.`);
      else if(placeIds.has(place.id))errors.push(`ID de Local duplicado: ${place.id}.`);
      else placeIds.add(place.id);
      if(!place.name||!place.city)errors.push(`Local ${place.id||`na posição ${index}`} sem name ou city.`);
    });
    data.itinerary.forEach((day,index)=>{
      if(typeof day.id!=='string'||!day.id.trim())errors.push(`Dia na posição ${index} sem ID obrigatório.`);
      else if(dayIds.has(day.id))errors.push(`ID de dia duplicado: ${day.id}.`);
      else dayIds.add(day.id);
      if(!Array.isArray(day.localIds))errors.push(`Dia ${day.id||index} não possui localIds como array.`);
      else {
        day.localIds.forEach(id=>{if(!placeIds.has(id))errors.push(`Dia ${day.id} referencia Local inexistente: ${id}.`);});
        (day.optionalLocalIds||[]).forEach(id=>{
          if(!placeIds.has(id))errors.push(`Dia ${day.id} referencia Local opcional inexistente: ${id}.`);
          if(day.localIds.includes(id))errors.push(`Dia ${day.id} associa o mesmo Local como principal e opcional: ${id}.`);
        });
        Object.values(day.periods||{}).flat().forEach(entry=>{
          if(!entry||typeof entry!=='object'){errors.push(`Dia ${day.id} possui item de período inválido.`);return;}
          if(entry.localId&&entry.activityId)errors.push(`Item do dia ${day.id} não pode ser Local e atividade ao mesmo tempo.`);
          if(entry.localId&&!placeIds.has(entry.localId))errors.push(`Dia ${day.id} possui referência de período inválida: ${entry.localId}.`);
          else if(entry.localId&&!day.localIds.includes(entry.localId))errors.push(`Período do dia ${day.id} usa Local não associado: ${entry.localId}.`);
          if(!entry.localId){
            if(typeof entry.activityId!=='string'||!entry.activityId.trim())errors.push(`Atividade do dia ${day.id} sem activityId obrigatório.`);
            else if(activityIds.has(entry.activityId))errors.push(`activityId duplicado: ${entry.activityId}.`);
            else activityIds.add(entry.activityId);
            if(typeof entry.title!=='string'||!entry.title.trim())errors.push(`Atividade ${entry.activityId||'(sem ID)'} sem título.`);
          }
        });
      }
      if(day.hotelId&&!hotelIds.has(day.hotelId))errors.push(`Dia ${day.id} referencia hotel inexistente: ${day.hotelId}.`);
    });
    Object.entries(itineraryOps.days).forEach(([dayId,ops])=>{
      if(!dayIds.has(dayId)){errors.push(`Operação de roteiro referencia dia inexistente: ${dayId}.`);return;}
      const day=data.itinerary.find(item=>item.id===dayId);
      [...(ops.order||[]),...Object.keys(ops.places||{})].forEach(placeId=>{
        if(!placeIds.has(placeId))errors.push(`Operação do dia ${dayId} referencia Local inexistente: ${placeId}.`);
      });
      (ops.order||[]).forEach(placeId=>{if(!day.localIds.includes(placeId))errors.push(`Ordem do dia ${dayId} contém Local não associado: ${placeId}.`);});
      Object.keys(ops.places||{}).forEach(placeId=>{if(!day.localIds.includes(placeId))errors.push(`Checklist do dia ${dayId} contém Local não associado: ${placeId}.`);});
    });
    if(errors.length)console.error(`[TravelHub] Dados inválidos (${errors.length}). Corrija IDs e referências em TRAVEL_DATA (data.js):\n- ${errors.join('\n- ')}`);
    return errors;
  }
  rebuildPlacesById();
  function notifySessionChange(message = 'Alteração aplicada apenas nesta sessão') {
    toast(`${message}. Edite data.js para manter a alteração.`);
  }
  let toastTimer;
  function toast(message) { const node = document.querySelector('#manage-toast'); node.textContent = message; node.classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => node.classList.remove('visible'), 2400); }
  const hotelsGrid = document.querySelector('#hotels-grid');
  function formatHotelDate(value) {
    if (!value) return '';
    const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return match ? `${match[3]}/${match[2]}/${match[1]}` : String(value);
  }
  function hotelDateSummary(hotel) {
    const start = /^\d{4}-\d{2}-\d{2}$/.test(String(hotel.checkin || '')) ? formatHotelDate(hotel.checkin) : '';
    const end = /^\d{4}-\d{2}-\d{2}$/.test(String(hotel.checkout || '')) ? formatHotelDate(hotel.checkout) : '';
    if (start || end) return `${start || '—'} → ${end || '—'}`;
    return hotel.dates || '';
  }
  function renderHotels() {
    hotelsGrid.innerHTML = data.hotels.map((hotel,index) => {
      const address = [hotel.address,hotel.area].filter(Boolean).join(String.fromCharCode(10));
      const payment = [hotel.paymentStatus, hotel.paidAmount ? escapeHtml(new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(hotel.paidAmount))) : ''].filter(Boolean).join(' · ');
      const times = [['Check-in oficial',hotel.checkinTime],['Check-out oficial',hotel.checkoutTime]].filter(([,value])=>value).map(([label,value])=>`<span class="hotel-time"><strong>${label}:</strong> ${escapeHtml(value)}</span>`).join('');
      return `<article class="content-card"><div class="hotel-art">${escapeHtml(hotel.icon || '🏨')}</div><div class="hotel-content"><span class="hotel-city">${escapeHtml(hotel.city || '')}</span><h3>${escapeHtml(hotel.name || 'Hospedagem')}</h3>${address ? `<p class="hotel-address">${escapeHtml(address)}</p>` : ''}<div class="hotel-dates"><span>${escapeHtml(hotelDateSummary(hotel))}</span><span class="hotel-status ${hotel.paymentStatus === 'Pagar no hotel' ? 'is-due' : hotel.paymentStatus === 'Parcialmente pago' ? 'is-partial' : 'is-paid'}">${escapeHtml(hotel.paymentStatus || (hotel.booking ? 'Reservado' : 'Hospedagem'))}</span></div>${times ? `<div class="hotel-times">${times}</div>` : ''}${hotel.nearestStation ? `<div class="hotel-station"><span>🚇</span><div><strong>${escapeHtml(hotel.nearestStation)}</strong>${hotel.stationWalkTime ? `<small>${escapeHtml(hotel.stationWalkTime)} a pé</small>` : ''}</div></div>` : ''}${payment ? `<div class="hotel-payment"><span>Pagamento</span><strong>${escapeHtml(payment)}</strong></div>` : ''}<div class="hotel-card-actions">${hotel.maps ? `<a class="manage-button hotel-map-button" href="${escapeHtml(hotel.maps)}" target="_blank" rel="noopener noreferrer">Abrir no mapa</a>` : ''}<div class="record-actions"><button type="button" class="manage-button" data-record-action="edit" data-collection="hotel" data-index="${index}">Editar</button><button type="button" class="manage-button danger" data-record-action="delete" data-collection="hotel" data-index="${index}">Excluir</button></div></div></div></article>`;
    }).join('');
    syncSummaryCounts();
  }
  const themeButton = document.querySelector('#theme-toggle');
  const availableThemes = ['dark', 'light'];
  const themeDetails = {
    dark: {label:'Dark',icon:'◐'},
    light: {label:'Light',icon:'☼'}
  };
  let selectedTheme = 'dark';
  try {
    const savedTheme = localStorage.getItem('travelhub-theme');
    if (availableThemes.includes(savedTheme)) selectedTheme = savedTheme;
  } catch {}
  function applyTheme(theme, persist = false) {
    selectedTheme = availableThemes.includes(theme) ? theme : 'dark';
    document.documentElement.dataset.theme = selectedTheme;
    const details = themeDetails[selectedTheme];
    themeButton.querySelector('.theme-toggle-icon').textContent = details.icon;
    themeButton.querySelector('.theme-toggle-label').textContent = details.label;
    themeButton.setAttribute('aria-label', `Mudar tema. Tema atual: ${details.label}`);
    themeButton.title = `Tema atual: ${details.label}`;
    if (persist) {
      try { localStorage.setItem('travelhub-theme', selectedTheme); } catch {}
    }
  }
  applyTheme(selectedTheme);
  themeButton.addEventListener('click', () => {
    const nextTheme = availableThemes[(availableThemes.indexOf(selectedTheme) + 1) % availableThemes.length];
    applyTheme(nextTheme, true);
  });

  const pages = [...document.querySelectorAll('.page')];
  const navLinks = [...document.querySelectorAll('.nav-link')];
  const sidebar = document.querySelector('#sidebar');
  const menuButton = document.querySelector('#menu-button');

  function goToPage(name) {
    const page = document.querySelector(`#page-${name}`) || document.querySelector('#page-dashboard');
    if (page.id === 'page-roteiro' && typeof renderItinerary === 'function') renderItinerary();
    pages.forEach(item => item.classList.toggle('active-page', item === page));
    navLinks.forEach(link => link.classList.toggle('active', link.dataset.page === page.id.replace('page-', '')));
    document.querySelector('#breadcrumb-current').textContent = page.dataset.title;
    history.replaceState(null, '', `#${page.id.replace('page-', '')}`);
    sidebar.classList.remove('open');
    menuButton.setAttribute('aria-expanded', 'false');
    window.scrollTo({top: 0, behavior: 'smooth'});
  }
  navLinks.forEach(link => link.addEventListener('click', event => { event.preventDefault(); goToPage(link.dataset.page); }));
  window.addEventListener('hashchange', () => goToPage(location.hash.slice(1)));
  menuButton.addEventListener('click', () => { const open = sidebar.classList.toggle('open'); menuButton.setAttribute('aria-expanded', String(open)); });
  document.addEventListener('click', event => { if (sidebar.classList.contains('open') && !sidebar.contains(event.target) && !menuButton.contains(event.target)) sidebar.classList.remove('open'); });

  const itinerary = document.querySelector('#itinerary-list');
  validateTravelData();
  let itineraryCity = 'todos';
  let todayMode = false;
  let focusedDay = '';
  let itineraryViewMode = 'detailed';
  let activeItineraryDate = '';
  const itineraryCollapsedStorageKey = 'travelhub-itinerary-collapsed-v1';
  let collapsedItineraryDays = new Set();
  const itineraryNoteDrafts = new Map();
  let itineraryDayObserver = null;
  try {
    const savedCollapsedDays = JSON.parse(localStorage.getItem(itineraryCollapsedStorageKey) || '[]');
    if (Array.isArray(savedCollapsedDays)) collapsedItineraryDays = new Set(savedCollapsedDays.filter(id => typeof id === 'string'));
  } catch (error) { console.warn('[TravelHub] Não foi possível carregar o estado recolhido dos dias.', error); }
  let itineraryManagerDay = null;
  let itineraryManagerSelection = new Set();
  const itineraryTodayButton = document.querySelector('#today-mode-toggle');
  const itineraryControls = document.querySelector('.itinerary-controls');
  const itineraryEnhancedControls = document.createElement('div');
  itineraryEnhancedControls.className = 'itinerary-enhanced-controls';
  itineraryEnhancedControls.innerHTML = `<div class="itinerary-filter-row"><label class="itinerary-filter-field itinerary-search-field"><span>Buscar local</span><input type="search" data-itinerary-search placeholder="Nome do local" autocomplete="off"></label><label class="itinerary-filter-field"><span>Data</span><select data-itinerary-date-filter><option value="">Todas as datas</option></select></label><label class="itinerary-filter-field"><span>Status</span><select data-itinerary-status-filter><option value="">Todos os status</option><option value="planned">Planejado</option><option value="today">Hoje</option><option value="progress">Em andamento</option><option value="complete">Concluído</option></select></label><div class="itinerary-view-switch tabs" role="tablist" aria-label="Visualização do roteiro"><button type="button" class="tab" role="tab" data-itinerary-view="summary" aria-pressed="false">Resumo</button><button type="button" class="tab active" role="tab" data-itinerary-view="detailed" aria-pressed="true">Detalhado</button></div></div>`;
  itineraryControls.insertAdjacentElement('afterend', itineraryEnhancedControls);
  const itinerarySearchInput = itineraryEnhancedControls.querySelector('[data-itinerary-search]');
  const itineraryDateFilter = itineraryEnhancedControls.querySelector('[data-itinerary-date-filter]');
  const itineraryStatusFilter = itineraryEnhancedControls.querySelector('[data-itinerary-status-filter]');
  const itineraryDateNav = document.createElement('nav');
  itineraryDateNav.className = 'itinerary-date-nav';
  itineraryDateNav.setAttribute('aria-label','Navegação rápida por data');
  itineraryDateNav.dataset.itineraryDateNav = '';
  itineraryEnhancedControls.insertAdjacentElement('afterend',itineraryDateNav);
  function itineraryDateLabel(date) {
    const parsed = new Date(`${date}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? date : parsed.toLocaleDateString('pt-BR', {day:'2-digit',month:'2-digit'});
  }
  function isCurrentTripDate(date) {
    const dates=data.itinerary.map(day=>day.date).filter(Boolean).sort();
    const today=itineraryToday();
    return dates.length>0&&today>=dates[0]&&today<=dates[dates.length-1]&&date===today;
  }
  function setupItineraryDateNavigation() {
    const dates = [...new Set(data.itinerary.map(day => day.date).filter(Boolean))];
    itineraryDateFilter.innerHTML = '<option value="">Todas as datas</option>' + dates.map(date => `<option value="${escapeHtml(date)}">${escapeHtml(itineraryDateLabel(date))}</option>`).join('');
    itineraryDateNav.innerHTML = dates.map(date => {
      const day = data.itinerary.find(item => item.date === date);
      const isToday=isCurrentTripDate(date);
      return `<button type="button" class="date-chip itinerary-date-chip ${isToday?'is-today':''}" data-jump-date="${escapeHtml(date)}" aria-label="${isToday?'Hoje · ':''}Ir para ${escapeHtml(itineraryDateLabel(date))}"><span>${escapeHtml(itineraryDateLabel(date))}</span><small>${isToday?'Hoje':`Dia ${String(day?.day || '').padStart(2,'0')}`}</small></button>`;
    }).join('');
  }
  setupItineraryDateNavigation();
  function persistCollapsedItineraryDays() {
    try { localStorage.setItem(itineraryCollapsedStorageKey, JSON.stringify([...collapsedItineraryDays])); }
    catch (error) { console.warn('[TravelHub] Não foi possível salvar o estado recolhido dos dias.', error); }
  }
  const itineraryPlaceDialog = document.querySelector('#itinerary-place-dialog');
  const itineraryPlaceOptions = document.querySelector('#itinerary-place-options');
  function cityPlaces(day) { return data.places.filter(place=>place.city===day.city); }
  function renderItineraryPlaceOptions() {
    if(!itineraryManagerDay)return;
    const query=normalizeText(document.querySelector('#itinerary-place-search').value);
    const category=document.querySelector('#itinerary-place-category').value;
    const places=cityPlaces(itineraryManagerDay).filter(place=>(!query||normalizeText(place.name).includes(query))&&(!category||place.type===category))
      .sort((a,b)=>String(a.name||'').localeCompare(String(b.name||'')));
    itineraryPlaceOptions.innerHTML=places.length?places.map(place=>{
      const id=place.id,selected=itineraryManagerSelection.has(id);
      return `<label class="itinerary-place-option"><input type="checkbox" value="${escapeHtml(id)}" ${selected?'checked':''}><span class="itinerary-place-option-image">${place.image||place.imageUrl?`<img src="${escapeHtml(place.image||place.imageUrl)}" alt="" loading="lazy">`:escapeHtml(place.icon||'📍')}</span><span class="itinerary-place-option-copy"><strong>${escapeHtml(place.name||'Local')}</strong><small>${escapeHtml(place.type||'Atração')} · ${escapeHtml(place.city||itineraryManagerDay.city)}</small></span><span class="itinerary-place-option-check">✓</span></label>`;
    }).join(''):'<p class="itinerary-manager-empty">Nenhum local encontrado para esta pesquisa e cidade.</p>';
  }
  function openItineraryPlaceManager(day) {
    itineraryManagerDay=day;
    itineraryManagerSelection=new Set(day.localIds);
    const subtitle=document.querySelector('#itinerary-place-dialog-subtitle');
    subtitle.textContent=`${day.title} · ${day.city} · Dia ${day.day}`;
    document.querySelector('#itinerary-place-search').value='';
    const categories=[...new Set(cityPlaces(day).map(place=>place.type).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
    const categorySelect=document.querySelector('#itinerary-place-category');
    categorySelect.innerHTML='<option value="">Todas as categorias</option>'+categories.map(value=>`<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join('');
    renderItineraryPlaceOptions();
    itineraryPlaceDialog.showModal();
  }
  document.querySelector('#itinerary-place-search').addEventListener('input',renderItineraryPlaceOptions);
  document.querySelector('#itinerary-place-category').addEventListener('change',renderItineraryPlaceOptions);
  itineraryPlaceOptions.addEventListener('change',event=>{
    const checkbox=event.target.closest('input[type="checkbox"]'); if(!checkbox)return;
    if(checkbox.checked)itineraryManagerSelection.add(checkbox.value); else itineraryManagerSelection.delete(checkbox.value);
  });
  document.querySelectorAll('[data-close-itinerary-manager]').forEach(button=>button.addEventListener('click',()=>itineraryPlaceDialog.close()));
  itineraryPlaceDialog.addEventListener('click',event=>{if(event.target===itineraryPlaceDialog)itineraryPlaceDialog.close();});
  document.querySelector('#save-itinerary-places').addEventListener('click',()=>{
    if(!itineraryManagerDay)return;
    const ops=dayOps(itineraryManagerDay),previous=itineraryManagerDay.localIds;
    const ordered=[...previous.filter(id=>itineraryManagerSelection.has(id)),...cityPlaces(itineraryManagerDay).map(place=>place.id).filter(id=>itineraryManagerSelection.has(id)&&!previous.includes(id))];
    itineraryManagerDay.localIds=[...new Set(ordered)];
    Object.values(itineraryManagerDay.periods||{}).forEach(entries=>entries.splice(0,entries.length,...entries.filter(entry=>!entry.localId||itineraryManagerDay.localIds.includes(entry.localId))));
    ops.order=itineraryManagerDay.localIds.slice();
    Object.keys(ops.places).forEach(placeId=>{if(!itineraryManagerDay.localIds.includes(placeId))delete ops.places[placeId];});
    notifySessionChange('Locais do dia atualizados'); itineraryPlaceDialog.close(); renderItinerary();
  });
  const itineraryPeriods = [['morning','Manhã','☀'],['afternoon','Tarde','◒'],['night','Noite','☾']];
  function itineraryToday() {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  }
  function dayOps(day) {
    return itineraryOps.days[day.id];
  }
  function savedDayNote(day) {
    return dayOps(day).notes || '';
  }
  function unlinkPlaceFromDays(placeId) {
    data.itinerary.forEach(day=>{
      const ops=dayOps(day);
      day.localIds=day.localIds.filter(id=>id!==placeId);
      Object.values(day.periods||{}).forEach(entries=>entries.splice(0,entries.length,...entries.filter(entry=>entry.localId!==placeId)));
      ops.order=ops.order.filter(id=>id!==placeId);
      delete ops.places[placeId];
    });
    notifySessionChange('Local removido do roteiro');
  }
  function normalizeText(value) {
    return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  }
  function buildDayItems(day) {
    const ops=dayOps(day),items=[],order=ops.order.length?ops.order:day.localIds;
    const localIds=day.localIds;
    localIds.forEach((placeId,index)=>{
      const place=placesById.get(placeId);
      if(!place){console.error(`[TravelHub] Dia ${day.id} referencia Local inexistente: ${placeId}`);return;}
      const state=ops.places[placeId]||{};
      items.push({key:`local:${placeId}`,placeId,name:place.name,place,isPlace:true,period:'afternoon',periodIndex:1,index,time:state.time||'',visited:Boolean(state.visited),fullDay:false});
    });
    itineraryPeriods.forEach(([period,,],periodIndex)=>{
      (day.periods?.[period]||[]).forEach((entry,index)=>{
        if(entry.localId){
          const item=items.find(candidate=>candidate.placeId===entry.localId);
          if(item){item.period=entry.allDay?'morning':period;item.periodIndex=entry.allDay?0:periodIndex;item.periodOrder=index;item.fullDay=Boolean(entry.allDay);}
          return;
        }
        items.push({key:`activity:${entry.activityId}`,activityId:entry.activityId,name:entry.title,place:null,isPlace:false,period,periodIndex,periodOrder:index,index});
      });
    });
    return items.sort((a,b) => {
      const orderA=a.placeId?order.indexOf(a.placeId):-1,orderB=b.placeId?order.indexOf(b.placeId):-1;
      const manualA=orderA<0?a.index:orderA,manualB=orderB<0?b.index:orderB;
      if (a.time && b.time) return a.time.localeCompare(b.time) || manualA-manualB;
      if (a.time) return -1;
      if (b.time) return 1;
      return a.periodIndex-b.periodIndex || (a.periodOrder??manualA)-(b.periodOrder??manualB) || manualA-manualB;
    });
  }
  function dayStatus(day, completed, total) {
    if (total > 0 && completed === total) return ['Concluído','complete'];
    if (completed > 0) return ['Em andamento','progress'];
    if (day.date === itineraryToday()) return ['Hoje','today'];
    return ['Planejado','planned'];
  }
  function dayRouteUrl(items, day, hotel = null) {
    const stops = [...(hotel?.name?[hotel.name]:[]),...items.filter(item => item.isPlace).map(item => item.place?.name || item.name)];
    if (!stops.length) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${day.city}, Japan`)}`;
    if (stops.length === 1) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${stops[0]}, ${day.city}, Japan`)}`;
    const url = new URL('https://www.google.com/maps/dir/');
    url.searchParams.set('api','1');
    url.searchParams.set('origin',`${stops[0]}, ${day.city}, Japan`);
    url.searchParams.set('destination',`${stops[stops.length-1]}, ${day.city}, Japan`);
    if (stops.length > 2) url.searchParams.set('waypoints',stops.slice(1,-1).map(stop=>`${stop}, ${day.city}, Japan`).join('|'));
    return url.href;
  }
  function todayOperationsPanel(day, items, hotel) {
    const places=items.filter(item=>item.isPlace),now=new Date(),minutesNow=now.getHours()*60+now.getMinutes();
    const scheduled=places.filter(item=>/^\d{2}:\d{2}$/.test(item.time)).sort((a,b)=>a.time.localeCompare(b.time));
    const current=scheduled.find(item=>{const start=Number(item.time.slice(0,2))*60+Number(item.time.slice(3));return start<=minutesNow&&minutesNow<start+Math.max(estimateMinutes(item.place?.tempoEstimado),60);});
    const next=scheduled.find(item=>Number(item.time.slice(0,2))*60+Number(item.time.slice(3))>minutesNow);
    const reservation=places.find(item=>item.place?.reservaNecessaria==='Sim'&&item.place?.statusReserva!=='Concluída'&&!item.visited);
    const transfer=current?transitBetween(current.place):null;
    const completed=places.filter(item=>item.visited).length,total=places.length,percent=total?Math.round(completed/total*100):0;
    const stat=(label,value)=>`<div class="itinerary-today-stat"><small>${label}</small><strong>${value}</strong></div>`;
    return `<section class="itinerary-today-panel"><div class="itinerary-today-heading"><div><span>GUIA OPERACIONAL</span><h2>Hoje · ${escapeHtml(new Date(`${day.date}T00:00:00`).toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'}))}</h2></div><span class="itinerary-day-status status-${dayStatus(day,completed,total)[1]}">${dayStatus(day,completed,total)[0]}</span></div><div class="itinerary-today-grid">${stat('Hotel atual',hotel?.name||'Sem hospedagem cadastrada')}${stat('Atividade atual',current?`${current.time} · ${current.name}`:'Nenhuma atividade em andamento')}${stat('Próxima atividade',next?`${next.time} · ${next.name}`:'Sem próximas atividades')}${stat('Próxima reserva',reservation?.name||'Nenhuma reserva pendente')}${stat('Próximo deslocamento',transfer?`${transfer.icon} ${transfer.duration}`:'Sem deslocamento cadastrado')}</div><div class="itinerary-today-progress"><div><strong>Checklist do dia</strong><span>${completed}/${total} locais · ${percent}%</span></div><div class="itinerary-progress-track"><span style="width:${percent}%"></span></div></div></section>`;
  }
  function dayCostSummary(items) {
    const totals = new Map();
    items.filter(item=>item.isPlace && item.place).forEach(item => {
      const place=item.place;
      let amount=Number(place.priceValue),currency=place.priceCurrency;
      if (!Number.isFinite(amount) || place.priceValue === '' || !currency) {
        const legacy=String(place.price || '').trim();
        const currencyMatch=legacy.match(/JPY|USD|BRL|¥|R\$|US\$/i);
        currency=currency || (currencyMatch ? (/JPY|¥/i.test(currencyMatch[0])?'JPY':/BRL|R\$/i.test(currencyMatch[0])?'BRL':'USD') : '');
        const numeric=legacy.replace(/\s/g,'').replace(/[^\d.,-]/g,'');
        const normalized=/,\d{1,2}$/.test(numeric)?numeric.replace(/\./g,'').replace(',','.'):numeric.replace(/,/g,'');
        amount=Number(normalized);
      }
      if (Number.isFinite(amount) && currency) totals.set(currency,(totals.get(currency)||0)+amount);
    });
    return totals.size ? [...totals].map(([currency,amount]) => {
      try { return new Intl.NumberFormat('pt-BR',{style:'currency',currency}).format(amount); }
      catch { return `${currency} ${amount}`; }
    }).join(' · ') : 'Sem valores cadastrados';
  }
  function estimateMinutes(value) {
    const text=String(value||'').trim().toLowerCase();
    if(!text)return 0;
    if(text.includes('meio dia'))return 240;
    if(text.includes('dia inteiro'))return 480;
    const hours=Number(text.match(/(\d+)\s*h/)?.[1]||0),minutes=Number(text.match(/(\d+)\s*(?:min|m)/)?.[1]||0);
    return hours*60+minutes;
  }
  function estimateSummary(items) {
    const total=items.filter(item=>item.isPlace).reduce((sum,item)=>sum+estimateMinutes(item.place?.tempoEstimado),0);
    return total?`${Math.floor(total/60)}h${total%60?String(total%60).padStart(2,'0'):''} estimadas`:'Sem tempo cadastrado';
  }
  function hotelForDay(day) {
    return data.hotels.find(hotel=>hotel.id===day.hotelId)||null;
  }
  function transitBetween(place) {
    if (!place) return null;
    const duration=place.travelTimeToNext || place.transitTimeToNext || place.tempoDeslocamento || place.estimatedTravelTime || '';
    if (!duration) return null;
    const mode=String(place.transportMode || place.meioTransporte || place.deslocamento || '').toLowerCase();
    const icon=/train|trem|shinkansen/.test(mode)?'🚄':/metro|metrô|subway/.test(mode)?'🚇':/walk|caminh|pé/.test(mode)?'🚶':'↔';
    return {duration,icon};
  }
  function itineraryItemMarkup(item,day,ops,index,items) {
    const place=item.place, image=place?.image || place?.imageUrl || '';
    const maps=place?.maps || (item.isPlace ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${item.name}, ${day.city}, Japan`)}` : '');
    const status=place?.status||'Quero visitar',priority=place?.prioridade||'Gostaria de ir';
    const details=item.isPlace?[`<span class="itinerary-place-category">${escapeHtml(place?.type||'Atração')}</span>`,`<span class="itinerary-place-priority">${escapeHtml(priority)}</span>`,`<span class="itinerary-place-status">${escapeHtml(status)}</span>`].join(''):'';
    const icon=place?.icon||'📍', dayKey=day.id;
    const timeControl=item.isPlace?`<label class="itinerary-time-label" aria-label="Horário planejado de ${escapeHtml(item.name)}"><input type="time" value="${escapeHtml(item.time)}" data-item-time="${escapeHtml(item.placeId)}" data-day-key="${escapeHtml(dayKey)}" aria-label="Horário de ${escapeHtml(item.name)}"></label>`:'';
    const checklist=item.isPlace?`<label class="itinerary-visited"><input type="checkbox" data-visited-item="${escapeHtml(item.placeId)}" data-day-key="${escapeHtml(dayKey)}" ${item.visited?'checked':''}><span>Visitado</span></label>`:'';
    const manualOrder=ops.order.length?ops.order:day.localIds;
    const localPosition=item.placeId?manualOrder.indexOf(item.placeId):-1;
    const orderControls=item.placeId?`<div class="itinerary-order-controls"><button type="button" data-move-local="up" data-place-id="${escapeHtml(item.placeId)}" data-day-key="${escapeHtml(dayKey)}" aria-label="Mover ${escapeHtml(item.name)} para cima" ${localPosition<=0?'disabled':''}>↑</button><button type="button" data-move-local="down" data-place-id="${escapeHtml(item.placeId)}" data-day-key="${escapeHtml(dayKey)}" aria-label="Mover ${escapeHtml(item.name)} para baixo" ${localPosition===manualOrder.length-1?'disabled':''}>↓</button></div>`:'';
    const alertBadges=[place?.reservaNecessaria==='Sim'?'<span class="itinerary-alert-badge alert-reservation">Reserva obrigatória</span>':'',place?.priceValue>0||place?.price?'<span class="itinerary-alert-badge alert-ticket">Ingresso / custo</span>':'',item.time?'<span class="itinerary-alert-badge alert-time">Horário definido</span>':'',priority==='Imperdível'?'<span class="itinerary-alert-badge alert-must">Imperdível</span>':''].filter(Boolean).join('');
    const tags=Array.isArray(place?.tags)?place.tags:String(place?.tags||'').split(',').map(tag=>tag.trim()).filter(Boolean);
    const tagBadges=tags.map(tag=>`<span class="itinerary-place-tag">${escapeHtml(tag)}</span>`).join('');
    const detailImage=image?`<img class="itinerary-detail-image" src="${escapeHtml(image)}" alt="${escapeHtml(item.name)}" loading="lazy">`:'';
    const detailContent=`${detailImage}${place?.description?`<p>${escapeHtml(place.description)}</p>`:''}${place?.openingHours?`<p><strong>Horário de funcionamento:</strong> ${escapeHtml(place.openingHours)}</p>`:''}${place?.notes?`<p><strong>Observações do local:</strong> ${escapeHtml(place.notes)}</p>`:''}${place?.priceValue!==undefined&&place.priceValue!==''?`<p><strong>Preço:</strong> ${escapeHtml(place.priceCurrency||'')} ${escapeHtml(String(place.priceValue))}</p>`:place?.price?`<p><strong>Preço:</strong> ${escapeHtml(String(place.price))}</p>`:''}${place?.reservaNecessaria||place?.statusReserva?`<p><strong>Reserva:</strong> ${escapeHtml(place.reservaNecessaria||'')} ${escapeHtml(place.statusReserva||'')}</p>`:''}${tagBadges?`<div class="itinerary-place-tags">${tagBadges}</div>`:''}${maps?`<a href="${escapeHtml(maps)}" target="_blank" rel="noopener noreferrer" class="itinerary-map-link">Abrir no mapa ↗</a>`:''}`;
    const periodLabel=item.time?'Horário definido':(itineraryPeriods.find(([key])=>key===item.period)?.[1]||'Dia');
    const coverMarkup=item.isPlace?`<button type="button" class="itinerary-compact-cover itinerary-place-cover-trigger ${image?'has-image':''}" data-itinerary-place-id="${escapeHtml(item.placeId)}" aria-label="Ver detalhes de ${escapeHtml(item.name)}">${image?`<img src="${escapeHtml(image)}" alt="" loading="lazy">`:escapeHtml(icon)}</button>`:`<span class="itinerary-compact-cover ${image?'has-image':''}">${image?`<img src="${escapeHtml(image)}" alt="" loading="lazy">`:escapeHtml(icon)}</span>`;
    const nameMarkup=item.isPlace?`<button type="button" class="itinerary-place-name" data-itinerary-place-id="${escapeHtml(item.placeId)}">${escapeHtml(item.name)}</button>`:`<strong>${escapeHtml(item.name)}</strong>`;
    const card=`<div class="itinerary-compact-row"><span class="itinerary-compact-time">${escapeHtml(item.time||'—')}</span>${coverMarkup}<div class="itinerary-compact-copy"><small>${periodLabel} · ${details?escapeHtml(place?.type||'Atração'):'Atividade'}</small>${nameMarkup}<div class="itinerary-place-badges">${details}</div>${alertBadges?`<div class="itinerary-alerts">${alertBadges}</div>`:''}</div><div class="itinerary-compact-actions">${timeControl}${checklist}${orderControls}</div></div>${item.isPlace?`<details class="itinerary-place-details"><summary>Detalhes</summary><div class="itinerary-detail-content">${detailContent}</div></details>`:`<details class="itinerary-place-details activity-details"><summary>Detalhes</summary><div class="itinerary-detail-content">${maps?`<a href="${escapeHtml(maps)}" target="_blank" rel="noopener noreferrer" class="itinerary-map-link">Abrir no mapa ↗</a>`:''}</div></details>`}`;
    const next=item.isPlace?transitBetween(place):null;
    const leg=next && items.slice(index+1).some(candidate=>candidate.isPlace)?`<div class="itinerary-transfer"><span>${next.icon}</span><small>${escapeHtml(String(next.duration))}</small></div>`:'';
    return `<li class="itinerary-timeline-item ${item.isPlace?'is-place':'is-activity'}" data-is-place="${item.isPlace?'true':'false'}">${card}${leg}</li>`;
  }
  function itineraryAllDayContinuationMarkup(item,label) {
    const image=item.place?.image||item.place?.imageUrl||'',icon=item.place?.icon||'📍',cover=image?`<img class="itinerary-place-image" src="${escapeHtml(image)}" alt="" loading="lazy">`:escapeHtml(icon);
    return `<li class="itinerary-timeline-item is-place"><div class="itinerary-compact-row"><span class="itinerary-compact-time">↳</span><button type="button" class="itinerary-compact-cover itinerary-place-cover-trigger ${image?'has-image':''}" data-fallback-icon="${escapeHtml(icon)}" data-itinerary-place-id="${escapeHtml(item.placeId)}" aria-label="Ver detalhes de ${escapeHtml(item.name)}">${cover}</button><div class="itinerary-compact-copy"><small>${label} · Dia inteiro</small><button type="button" class="itinerary-place-name" data-itinerary-place-id="${escapeHtml(item.placeId)}">${escapeHtml(item.name)}</button></div></div></li>`;
  }
  function updateDayProgressUI(card,day) {
    const checks=[...card.querySelectorAll('[data-visited-item]')];
    const completed=checks.filter(input=>input.checked).length,total=checks.length,percent=total?Math.round(completed/total*100):0;
    const [label,kind]=dayStatus(day,completed,total),badge=card.querySelector('[data-day-status]');
    card.querySelector('[data-day-visited-count]').textContent=`${completed}/${total}`;
    card.querySelector('[data-day-progress-percent]').textContent=`visitados · ${percent}%`;
    card.querySelector('[data-day-progress-bar]').style.width=`${percent}%`;
    badge.textContent=label; badge.className=`itinerary-day-status status-${kind}`;
    if(todayMode&&day.date===itineraryToday()) {
      const panel=itinerary.querySelector('.itinerary-today-panel');
      if(panel)panel.outerHTML=todayOperationsPanel(day,buildDayItems(day),hotelForDay(day));
    }
  }
  function renderItinerary(city = itineraryCity) {
    itineraryCity=city;
    if(itineraryDayObserver)itineraryDayObserver.disconnect();
    const searchQuery=normalizeText(itinerarySearchInput.value),selectedDate=itineraryDateFilter.value,selectedStatus=itineraryStatusFilter.value;
    let days=data.itinerary.filter(day=>todayMode?day.date===itineraryToday():(city==='todos'||day.city===city));
    if(selectedDate)days=days.filter(day=>day.date===selectedDate);
    if(selectedStatus)days=days.filter(day=>{const places=buildDayItems(day).filter(item=>item.isPlace),completed=places.filter(item=>item.visited).length;return dayStatus(day,completed,places.length)[1]===selectedStatus;});
    if(searchQuery)days=days.filter(day=>buildDayItems(day).some(item=>item.isPlace&&normalizeText(item.name).includes(searchQuery))||(day.optionalLocalIds||[]).some(id=>normalizeText(placesById.get(id)?.name).includes(searchQuery)));
    itineraryDateNav.querySelectorAll('[data-jump-date]').forEach(button=>{
      const active=button.dataset.jumpDate===(selectedDate||activeItineraryDate);
      button.classList.toggle('active',active);
      const isToday=isCurrentTripDate(button.dataset.jumpDate);
      button.classList.toggle('is-today',isToday);
      button.querySelector('small').textContent=isToday?'Hoje':`Dia ${String(data.itinerary.find(day=>day.date===button.dataset.jumpDate)?.day||'').padStart(2,'0')}`;
      button.setAttribute('aria-label',`${isToday?'Hoje · ':''}Ir para ${itineraryDateLabel(button.dataset.jumpDate)}`);
      if(active)button.setAttribute('aria-current','date');else button.removeAttribute('aria-current');
    });
    if(focusedDay) {
      const focusExists=days.some(day=>String(day.id||day.day)===focusedDay);
      if(focusExists)days=days.filter(day=>String(day.id||day.day)===focusedDay); else focusedDay='';
    }
    if(!days.length) {
      itinerary.innerHTML=`<div class="itinerary-empty"><strong>${todayMode?'Nenhum dia do roteiro para hoje':'Nenhum dia encontrado'}</strong><span>${todayMode?'O Modo Hoje mostrará aqui o roteiro quando a data da viagem chegar.':'Ajuste data, cidade, status ou busca para ver dias do roteiro.'}</span></div>`;
      return;
    }
    itinerary.innerHTML=days.map(day=>{
      const ops=dayOps(day),items=buildDayItems(day),places=items.filter(item=>item.isPlace),completed=places.filter(item=>item.visited).length,total=places.length,percent=total?Math.round(completed/total*100):0;
      const [status,statusKind]=dayStatus(day,completed,total),dayKey=day.id,notesId=`day-notes-${day.id}`,savedNote=itineraryNoteDrafts.has(day.id)?itineraryNoteDrafts.get(day.id):savedDayNote(day),currentHotel=hotelForDay(day),route=dayRouteUrl(items,day,currentHotel),cost=dayCostSummary(items),duration=estimateSummary(items);
      const feedbackChoices=['Gostei muito','Não valeu a pena','Quero voltar'];
      const displayItems=searchQuery?items.filter(item=>item.isPlace&&normalizeText(item.name).includes(searchQuery)):items;
      const timeline=itineraryPeriods.map(([period,label,icon])=>{
        const periodItems=displayItems.flatMap(item=>item.fullDay?[{item,index:items.indexOf(item),continuation:period!=='morning'}]:item.period===period?[{item,index:items.indexOf(item),continuation:false}]:[]);
        if(itineraryViewMode==='summary'){
          const names=periodItems.filter(({item})=>item.isPlace).map(({item})=>`<li><button type="button" class="itinerary-summary-place-link" data-itinerary-place-id="${escapeHtml(item.placeId)}">${escapeHtml(item.name)}</button></li>`).join('');
          return `<section class="itinerary-period-group itinerary-period-summary"><h4><span aria-hidden="true">${icon}</span>${label}</h4>${names?`<ul>${names}</ul>`:'<p>Nenhum local planejado</p>'}</section>`;
        }
        const rendered=periodItems.map(({item,index,continuation})=>continuation?itineraryAllDayContinuationMarkup(item,label):itineraryItemMarkup(item,day,ops,index,items)).join('');
        return rendered?`<section class="itinerary-period-group"><h4><span aria-hidden="true">${icon}</span>${label}</h4><ol class="itinerary-timeline">${rendered}</ol></section>`:'';
      }).join('');
      const optionalPlaces=(day.optionalLocalIds||[]).map(id=>placesById.get(id)).filter(place=>place&&(!searchQuery||normalizeText(place.name).includes(searchQuery)));
      const optionalTimeline=optionalPlaces.length?`<section class="itinerary-period-group itinerary-period-summary"><h4><span aria-hidden="true">☆</span>Opcional · Se sobrar tempo</h4><ul>${optionalPlaces.map(place=>`<li><button type="button" class="itinerary-summary-place-link" data-itinerary-place-id="${escapeHtml(place.id)}">${escapeHtml(place.name)}</button></li>`).join('')}</ul></section>`:'';
      const feedback=feedbackChoices.map(choice=>`<button type="button" class="itinerary-feedback-choice ${ops.feedback===choice?'active':''}" data-feedback-choice="${escapeHtml(choice)}" data-day-key="${escapeHtml(dayKey)}">${escapeHtml(choice)}</button>`).join('');
      const focussing=focusedDay===dayKey,isCollapsed=collapsedItineraryDays.has(dayKey);
      return `<article class="day-card operational-day-card ${isCollapsed?"is-collapsed":""} ${itineraryViewMode==="summary"?"is-summary":""}" data-itinerary-day="${escapeHtml(dayKey)}" data-date="${escapeHtml(day.date)}"><div class="day-card-banner ${cityClass(day.city)}-banner"><span class="day-banner-label">${escapeHtml(day.city.toUpperCase())} <i>·</i> ${escapeHtml(day.date)}</span><span class="day-number">DIA <strong>${String(day.day).padStart(2,'0')}</strong></span><span class="day-banner-symbol">${citySymbol(day.city)}</span></div><div class="day-card-body"><div class="day-title-row"><div><span class="day-city">${escapeHtml(day.city.toUpperCase())}</span><h3>${escapeHtml(day.title)}</h3></div><span class="itinerary-day-status status-${statusKind}" data-day-status>${status}</span><button type="button" class="manage-button itinerary-collapse-button" data-toggle-day="${escapeHtml(dayKey)}" aria-expanded="${!isCollapsed}" aria-label="${isCollapsed?"Expandir":"Recolher"} dia ${String(day.day).padStart(2,"0")}">${isCollapsed?"＋":"−"} <span>${isCollapsed?"Expandir":"Recolher"}</span></button></div><p class="day-description">${escapeHtml(day.detail || '')}</p><div class="itinerary-day-actions"><button type="button" class="manage-button" data-manage-locations="${escapeHtml(dayKey)}">Gerenciar locais</button><button type="button" class="manage-button" data-focus-day="${escapeHtml(dayKey)}">${focussing?'Sair do foco':'Focar neste dia'}</button></div>${currentHotel?`<div class="itinerary-current-hotel"><span>HOTEL ATUAL</span><strong>${escapeHtml(currentHotel.name||'Hospedagem')}</strong></div>`:''}<div class="itinerary-day-overview"><div class="itinerary-summary-stat"><strong>${total} locais</strong><span>no dia</span></div><div class="itinerary-summary-stat"><strong>${escapeHtml(duration)}</strong><span>tempo estimado</span></div><div class="itinerary-summary-stat"><strong>${escapeHtml(cost)}</strong><span>custo previsto</span></div><div class="itinerary-summary-stat"><strong data-day-visited-count>${completed}/${total}</strong><span data-day-progress-percent>visitados · ${percent}%</span></div><div class="itinerary-progress-track"><span data-day-progress-bar style="width:${percent}%"></span></div><a class="maps-button itinerary-route-button" href="${escapeHtml(route)}" target="_blank" rel="noopener noreferrer"><span>↗</span> Ver mapa do dia</a></div><div class="itinerary-timeline-wrap"><h4 class="itinerary-section-title">${itineraryViewMode==="summary"?"Resumo por período":"Timeline do dia"}</h4>${timeline}${optionalTimeline}</div><section class="itinerary-feedback"><span class="itinerary-section-title">Como foi o dia?</span><div class="itinerary-feedback-choices">${feedback}</div><div class="notes-wrap"><label for="${notesId}"><span>✎</span> OBSERVAÇÃO LIVRE</label><textarea id="${notesId}" class="day-notes" data-day="${day.id}" placeholder="Anote algo que quer lembrar deste dia..." rows="3">${escapeHtml(savedNote)}</textarea><div class="notes-actions"><button class="save-notes" type="button" data-save-day="${day.id}">Salvar observação</button><span class="save-feedback" aria-live="polite" data-feedback-day="${day.id}"></span></div></div></section></div></article>`;
    }).join('');
    if(todayMode&&days.length){const day=days[0];itinerary.insertAdjacentHTML('afterbegin',todayOperationsPanel(day,buildDayItems(day),hotelForDay(day)));}
    itinerary.querySelectorAll('.itinerary-place-image').forEach(image=>image.addEventListener('error',()=>{const cover=image.parentElement;image.remove();cover?.classList.remove('has-image');if(cover?.dataset.fallbackIcon)cover.textContent=cover.dataset.fallbackIcon;},{once:true}));
    if(itineraryDayObserver)itineraryDayObserver.disconnect();
    if('IntersectionObserver' in window){
      itineraryDayObserver=new IntersectionObserver(entries=>{
        const visible=entries.filter(entry=>entry.isIntersecting).sort((a,b)=>a.boundingClientRect.top-b.boundingClientRect.top)[0];
        if(!visible)return;
        activeItineraryDate=visible.target.dataset.date;
        if(!itineraryDateFilter.value)itineraryDateNav.querySelectorAll('[data-jump-date]').forEach(button=>{
          const active=button.dataset.jumpDate===activeItineraryDate;button.classList.toggle('active',active);
          if(active)button.setAttribute('aria-current','date');else button.removeAttribute('aria-current');
        });
      },{rootMargin:'-130px 0px -68% 0px',threshold:0});
      itinerary.querySelectorAll('[data-itinerary-day]').forEach(card=>itineraryDayObserver.observe(card));
    }
    itinerary.querySelectorAll('[data-save-day]').forEach(button=>button.addEventListener('click',()=>{
      const day=data.itinerary.find(item=>item.id===button.dataset.saveDay),ops=dayOps(day),field=itinerary.querySelector(`[data-day="${day.id}"]`),feedback=itinerary.querySelector(`[data-feedback-day="${day.id}"]`);
      try { ops.notes=field.value; itineraryNoteDrafts.delete(day.id); feedback.textContent='Aplicada nesta sessão; edite data.js para manter'; feedback.classList.add('saved'); window.setTimeout(()=>{feedback.textContent='';feedback.classList.remove('saved');},3200); }
      catch { feedback.textContent='Não foi possível aplicar a observação'; feedback.classList.remove('saved'); }
    }));
    itinerary.querySelectorAll('[data-visited-item]').forEach(input=>input.addEventListener('change',()=>{
      const day=data.itinerary.find(item=>item.id===input.dataset.dayKey),ops=dayOps(day);
      ops.places[input.dataset.visitedItem]||={}; ops.places[input.dataset.visitedItem].visited=input.checked;  updateDayProgressUI(input.closest('[data-itinerary-day]'),day);
    }));
    itinerary.querySelectorAll('[data-item-time]').forEach(input=>input.addEventListener('change',()=>{
      const day=data.itinerary.find(item=>item.id===input.dataset.dayKey),ops=dayOps(day);
      const placeId=input.dataset.itemTime,scrollTop=window.scrollY;
      const noteDrafts=[...itinerary.querySelectorAll('[data-day]')].map(field=>[field.dataset.day,field.value]);
      ops.places[placeId]||={}; ops.places[placeId].time=input.value;  renderItinerary();
      noteDrafts.forEach(([dayNumber,value])=>{const field=itinerary.querySelector(`[data-day="${dayNumber}"]`);if(field)field.value=value;});
      const reorderedInput=[...itinerary.querySelectorAll('[data-item-time]')].find(field=>field.dataset.itemTime===placeId);
      reorderedInput?.focus({preventScroll:true}); window.scrollTo(0,scrollTop);
    }));
    itinerary.querySelectorAll('[data-feedback-choice]').forEach(button=>button.addEventListener('click',()=>{
      const day=data.itinerary.find(item=>item.id===button.dataset.dayKey),ops=dayOps(day);
      ops.feedback=ops.feedback===button.dataset.feedbackChoice?'':button.dataset.feedbackChoice; 
      itinerary.querySelectorAll(`[data-day-key="${button.dataset.dayKey}"][data-feedback-choice]`).forEach(choice=>choice.classList.toggle('active',choice.dataset.feedbackChoice===ops.feedback));
    }));
    itinerary.querySelectorAll('[data-manage-locations]').forEach(button=>button.addEventListener('click',()=>{
      const day=data.itinerary.find(item=>item.id===button.dataset.manageLocations); if(day)openItineraryPlaceManager(day);
    }));
    itinerary.querySelectorAll('[data-focus-day]').forEach(button=>button.addEventListener('click',()=>{
      focusedDay=focusedDay===button.dataset.focusDay?'':button.dataset.focusDay; renderItinerary();
    }));
    itinerary.querySelectorAll('[data-move-local]').forEach(button=>button.addEventListener('click',()=>{
      const day=data.itinerary.find(item=>item.id===button.dataset.dayKey); if(!day)return;
      const ops=dayOps(day),ids=ops.order.length?ops.order.slice():day.localIds.slice();
      const index=ids.indexOf(button.dataset.placeId),target=index+(button.dataset.moveLocal==='up'?-1:1);
      if(index<0||target<0||target>=ids.length)return;
      [ids[index],ids[target]]=[ids[target],ids[index]]; ops.order=ids;  renderItinerary();
    }));
  }
  itinerary.addEventListener('input',event=>{const field=event.target.closest('[data-day]');if(field)itineraryNoteDrafts.set(field.dataset.day,field.value);});
  itinerary.addEventListener('click',event=>{
    const placeTrigger=event.target.closest('[data-itinerary-place-id]');
    if(placeTrigger){
      const place=placesById.get(placeTrigger.dataset.itineraryPlaceId);
      if(place)openPlace(place);
      return;
    }
    const button=event.target.closest('[data-toggle-day]');if(!button)return;
    const dayId=button.dataset.toggleDay;
    const card=button.closest('[data-itinerary-day]'),collapsed=!collapsedItineraryDays.has(dayId);
    if(collapsed)collapsedItineraryDays.add(dayId);else collapsedItineraryDays.delete(dayId);
    card?.classList.toggle('is-collapsed',collapsed);button.setAttribute('aria-expanded',String(!collapsed));button.setAttribute('aria-label',`${collapsed?'Expandir':'Recolher'} dia`);
    button.innerHTML=`${collapsed?'＋':'−'} <span>${collapsed?'Expandir':'Recolher'}</span>`;
    persistCollapsedItineraryDays();
  });
  itineraryTodayButton.addEventListener('click',()=>{
    todayMode=!todayMode; focusedDay=''; itineraryTodayButton.classList.toggle('active',todayMode); itineraryTodayButton.setAttribute('aria-pressed',String(todayMode));
    if(todayMode){itineraryDateFilter.value='';itineraryStatusFilter.value='';}
    renderItinerary();
  });
  function cityClass(city) { return city === 'Tóquio' ? 'tokyo' : city.toLowerCase(); }
  function citySymbol(city) { return city === 'Tóquio' ? '東京' : city === 'Kyoto' ? '京都' : '大阪'; }
  function escapeHtml(value) { return value.replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character])); }
  itinerarySearchInput.addEventListener('input',()=>renderItinerary());
  itineraryDateFilter.addEventListener('change',()=>renderItinerary());
  itineraryStatusFilter.addEventListener('change',()=>renderItinerary());
  itineraryEnhancedControls.querySelectorAll('[data-itinerary-view]').forEach(button=>button.addEventListener('click',()=>{
    itineraryViewMode=button.dataset.itineraryView;
    itineraryEnhancedControls.querySelectorAll('[data-itinerary-view]').forEach(option=>{const active=option===button;option.classList.toggle('active',active);option.setAttribute('aria-pressed',String(active));});
    renderItinerary();
  }));
  itineraryDateNav.addEventListener('click',event=>{
    const button=event.target.closest('[data-jump-date]');if(!button)return;
    const date=button.dataset.jumpDate,day=data.itinerary.find(item=>item.date===date);if(!day)return;
    todayMode=false;focusedDay='';itineraryCity='todos';activeItineraryDate=date;
    itineraryDateFilter.value=date;itineraryStatusFilter.value='';itinerarySearchInput.value='';
    itineraryTodayButton.classList.remove('active');itineraryTodayButton.setAttribute('aria-pressed','false');
    document.querySelectorAll('.itinerary-controls .tab').forEach(tab=>tab.classList.toggle('active',tab.dataset.city==='todos'));
    renderItinerary();
    requestAnimationFrame(()=>[...itinerary.querySelectorAll('[data-itinerary-day]')].find(card=>card.dataset.itineraryDay===day.id)?.scrollIntoView({behavior:'smooth',block:'start'}));
  });
  renderItinerary();
  document.querySelector('.itinerary-controls .tabs').addEventListener('click', event => {
    const tab=event.target.closest('.tab'); if(!tab)return;
    document.querySelectorAll('.itinerary-controls .tab').forEach(item=>item.classList.remove('active'));
    tab.classList.add('active'); todayMode=false; focusedDay=''; itineraryTodayButton.classList.remove('active'); itineraryTodayButton.setAttribute('aria-pressed','false'); renderItinerary(tab.dataset.city);
  });

  renderHotels();
  const flightContainer = document.querySelector('#flights-list');
  function flightDate(date) {
    if (!date) return '';
    const parsed = new Date(`${date}T00:00:00Z`);
    return Number.isNaN(parsed.getTime()) ? escapeHtml(date) : parsed.toLocaleDateString('pt-BR', {day:'2-digit',month:'short',year:'numeric',timeZone:'UTC'});
  }
  function segmentCard(segment, trip, direction, index) {
    const meals = Array.isArray(segment.meals) ? segment.meals : [];
    const airline = segment.airline || trip.airline || 'Companhia aérea não informada';
    const optionalDetails = [['Terminal',segment.terminal],['Portão',segment.gate],['Assento',segment.seat],['Classe',segment.travelClass]].filter(([,value]) => value);
    return `<article class="flight-card flight-segment-card"><div class="flight-segment-heading"><span>${direction === 'outbound' ? 'IDA' : 'VOLTA'} · TRECHO ${escapeHtml(String(segment.segment || ''))}</span><span>${flightDate(segment.date)}</span></div><div class="flight-company-row"><span class="flight-company-name">${escapeHtml(airline)}</span><strong>${escapeHtml(segment.flight || 'Voo pendente')}</strong></div><div class="flight-segment-route"><div class="flight-airport"><span class="flight-time-label">PARTIDA</span><strong>${escapeHtml(segment.from?.airport || '—')}</strong><span>${escapeHtml(segment.from?.city || '')}</span><small>${escapeHtml(segment.from?.time || 'Horário pendente')}</small></div><div class="flight-route"><div class="plane-line"><i></i><span>✈</span><i></i></div><span class="flight-route-label">${escapeHtml(airline)}</span></div><div class="flight-airport flight-right"><span class="flight-time-label">CHEGADA</span><strong>${escapeHtml(segment.to?.airport || '—')}</strong><span>${escapeHtml(segment.to?.city || '')}</span><small>${escapeHtml(segment.to?.time || 'Horário pendente')}</small></div></div>${optionalDetails.length || meals.length || segment.notes ? `<div class="flight-segment-details">${optionalDetails.map(([label,value]) => `<div class="flight-detail-group"><span>${label.toUpperCase()}</span><strong>${escapeHtml(String(value))}</strong></div>`).join('')}${meals.length ? `<div class="flight-detail-group"><span>REFEIÇÕES</span><strong>${meals.map(escapeHtml).join(' · ')}</strong></div>` : ''}${segment.notes ? `<p class="flight-notes">${escapeHtml(segment.notes)}</p>` : ''}</div>` : ''}<div class="record-actions"><button type="button" class="manage-button" data-record-action="edit" data-collection="flight" data-index="${index}">Editar</button><button type="button" class="manage-button danger" data-record-action="delete" data-collection="flight" data-index="${index}">Excluir</button></div></article>`;
  }
  function timeOnDate(date,time) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || '')) || !/^\d{2}:\d{2}$/.test(String(time || ''))) return null;
    const [year,month,day]=date.split('-').map(Number); const [hours,minutes]=time.split(':').map(Number);
    return {timestamp:Date.UTC(year,month-1,day,hours,minutes),minuteOfDay:hours*60+minutes,date};
  }
  function connectionDetails(previous,next) {
    const arrival=timeOnDate(previous.date,previous.to?.time); const departure=timeOnDate(next.date,next.from?.time);
    if (!arrival || !departure) return {minutes:null,city:previous.to?.city || next.from?.city || previous.to?.airport || next.from?.airport || 'Conexão'};
    let minutes=(departure.timestamp-arrival.timestamp)/60000;
    const dateGap=(departure.timestamp-arrival.timestamp)/86400000;
    if (dateGap > 1 && dateGap <= 2 && departure.minuteOfDay >= arrival.minuteOfDay) minutes=departure.minuteOfDay-arrival.minuteOfDay;
    if (minutes < 0 && arrival.date===departure.date) minutes+=1440;
    if (minutes < 0) minutes=null;
    return {minutes,city:previous.to?.city || next.from?.city || previous.to?.airport || next.from?.airport || 'Conexão'};
  }
  function connectionLabel(minutes) {
    if (minutes === null) return {label:'Horários incompletos',tone:'unknown'};
    if (minutes > 120) return {label:'Confortável',tone:'comfortable'};
    if (minutes >= 60) return {label:'Atenção',tone:'attention'};
    return {label:'Apertada',tone:'tight'};
  }
  function formatConnectionDuration(minutes) {
    if (minutes === null) return 'Tempo não calculado';
    const hours=Math.floor(minutes/60), remaining=minutes%60;
    return `${hours ? `${hours}h` : ''}${remaining ? `${hours ? ' ' : ''}${remaining}min` : (hours ? '' : '0min')}`;
  }
  function connectionCards(flights, direction, trip) {
    const sorted=[...flights].sort((a,b)=>(a.segment||0)-(b.segment||0));
    return sorted.slice(0,-1).map((previous,index)=>{
      const next=sorted[index+1], details=connectionDetails(previous,next), status=connectionLabel(details.minutes);
      return `<div class="connection-card connection-status-${status.tone}"><span class="connection-icon">↔</span><div class="connection-copy"><span class="connection-kicker">CONEXÃO · ${direction==='outbound'?'IDA':'VOLTA'}</span><strong>${escapeHtml(details.city)}</strong><small>${escapeHtml(previous.to?.airport || next.from?.airport || '')}${previous.to?.airport && next.from?.airport && previous.to.airport!==next.from.airport ? ` → ${escapeHtml(next.from.airport)}` : ''} · ${escapeHtml(previous.flight || '')} → ${escapeHtml(next.flight || '')}</small></div><div class="connection-duration"><strong>${formatConnectionDuration(details.minutes)}</strong><span class="connection-status-label">${status.label}</span></div></div>`;
    }).join('');
  }
  function renderDirection(trip, direction, title) {
    const flights=trip.flights.filter(flight=>flight.direction===direction).sort((a,b)=>(a.segment||0)-(b.segment||0));
    if (!flights.length) return `<section class="flight-direction"><div class="flight-section-heading"><div><span>VIAGEM</span><h2>${title}</h2></div></div><div class="flight-empty">Os trechos de ${title.toLowerCase()} ainda não foram cadastrados.</div></section>`;
    const timeline=flights.map((segment,index)=>`<div class="flight-timeline-item"><span class="flight-timeline-node" aria-hidden="true"></span>${segmentCard(segment,trip,direction,trip.flights.indexOf(segment))}</div>${index<flights.length-1?connectionCards([segment,flights[index+1]],direction,trip):''}`).join('');
    return `<section class="flight-direction"><div class="flight-section-heading"><div><span>VIAGEM</span><h2>${title}</h2></div><span class="flight-segment-count">${flights.length} ${flights.length===1?'trecho':'trechos'}</span></div><div class="flight-timeline">${timeline}</div></section>`;
  }
  function localDateKey(date=new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  }
  function renderFlights() {
    const trip=data.trip;
    const flights=Array.isArray(trip.flights)?trip.flights:[];
    const outbound=flights.filter(flight=>flight.direction==='outbound').sort((a,b)=>(a.segment||0)-(b.segment||0));
    const chronological=[...flights].filter(flight=>flight.date).sort((a,b)=>`${a.date} ${a.from?.time||''}`.localeCompare(`${b.date} ${b.from?.time||''}`));
    const originFlight=outbound[0]||chronological[0];
    const finalFlight=outbound[outbound.length-1]||chronological[chronological.length-1];
    const origin=originFlight?.from?.airport||'—';
    const destination=finalFlight?.to?.airport||'—';
    const passengers=Array.isArray(trip.passengers)?trip.passengers:[];
    const airline=trip.airline||flights.find(flight=>flight.airline)?.airline||'Companhia aérea pendente';
    const upcoming=flights.filter(flight=>flight.date&&flight.date>=localDateKey()).sort((a,b)=>`${a.date} ${a.from?.time||''}`.localeCompare(`${b.date} ${b.from?.time||''}`))[0];
    let nextFlightCard='';
    if(upcoming){
      const [year,month,day]=upcoming.date.split('-').map(Number);
      const today=new Date(); const todayUtc=Date.UTC(today.getFullYear(),today.getMonth(),today.getDate());
      const flightUtc=Date.UTC(year,month-1,day); const days=Math.max(0,Math.round((flightUtc-todayUtc)/86400000));
      const countdown=days===1?'Falta 1 dia':`Faltam ${days} dias`;
      nextFlightCard=`<section class="next-flight-card"><div class="next-flight-heading"><span>PRÓXIMO VOO</span><span class="next-flight-date">${flightDate(upcoming.date)}</span></div><div class="next-flight-main"><div><strong>${escapeHtml(upcoming.flight||'Voo pendente')}</strong><span>${escapeHtml(upcoming.airline||trip.airline||'Companhia aérea')}</span></div><div class="next-flight-route"><span>${escapeHtml(upcoming.from?.city||upcoming.from?.airport||'Origem')}</span><i>→</i><span>${escapeHtml(upcoming.to?.city||upcoming.to?.airport||'Destino')}</span></div><div class="next-flight-countdown">${countdown}</div></div></section>`;
    }
    const connectionSummary=[connectionCards(flights.filter(flight=>flight.direction==='outbound'),'outbound',trip),connectionCards(flights.filter(flight=>flight.direction==='return'||flight.direction==='inbound'),'return',trip)].filter(Boolean).join('');
    const passengerCards=passengers.map(passenger=>{
      const details=[['Passaporte',passenger.passport],['Nacionalidade',passenger.nationality],['Validade',passenger.passportExpiry?flightDate(passenger.passportExpiry):'']].filter(([,value])=>value).map(([label,value])=>`<span class="passenger-detail"><small>${label}</small><strong>${escapeHtml(String(value))}</strong></span>`).join('');
      return `<article class="passenger-card passenger-travel-card"><span class="passenger-avatar">${escapeHtml((passenger.name||'?').trim().charAt(0))}</span><div class="passenger-card-main"><strong>${escapeHtml(passenger.name||'Passageiro')}</strong><small>Bilhete ${escapeHtml(passenger.ticketNumber||'pendente')}</small>${details?`<div class="passenger-details">${details}</div>`:''}${passenger.notes?`<p class="passenger-notes">${escapeHtml(passenger.notes)}</p>`:''}</div><div class="record-actions"><button type="button" class="manage-button" data-record-action="edit" data-collection="passenger" data-index="${trip.passengers.indexOf(passenger)}">Editar</button><button type="button" class="manage-button danger" data-record-action="delete" data-collection="passenger" data-index="${trip.passengers.indexOf(passenger)}">Excluir</button></div></article>`;
    }).join('');
    flightContainer.innerHTML=`${nextFlightCard}<section class="flight-trip-summary"><div class="flight-summary-top"><div><span class="flight-summary-eyebrow">RESUMO DA RESERVA</span><h2>${escapeHtml(airline)}</h2><p>${passengers.length} ${passengers.length===1?'passageiro':'passageiros'} · ${flights.length} ${flights.length===1?'trecho':'trechos'}</p></div><div class="flight-route-summary"><strong>${escapeHtml(origin)}</strong><span>→</span><strong>${escapeHtml(destination)}</strong></div></div><div class="confirmation-row"><div><span>LOCALIZADOR</span><strong id="confirmation-code">${escapeHtml(trip.confirmationCode||'Pendente')}</strong></div>${trip.confirmationCode?'<button class="copy-code-button" type="button" id="copy-confirmation-code">Copiar código</button>':''}<span class="copy-feedback" id="copy-feedback" aria-live="polite"></span><button class="manage-button" type="button" data-edit-trip>Editar reserva</button><button class="manage-button" type="button" data-add="flight">Adicionar trecho</button></div></section>${renderDirection(trip,'outbound','Ida')}${renderDirection(trip,'return','Volta')}<section class="flight-direction connections-section"><div class="flight-section-heading"><div><span>ESCALAS</span><h2>Conexões</h2></div></div>${connectionSummary||'<div class="flight-empty">Adicione os trechos consecutivos para calcular conexões.</div>'}</section><section class="flight-direction passengers-section"><div class="flight-section-heading"><div><span>RESERVA</span><h2>Passageiros</h2></div><span class="flight-segment-count">${passengers.length}</span></div><div class="passenger-toolbar"><button class="manage-button" type="button" data-add="passenger">Adicionar passageiro</button></div>${passengers.length?`<div class="passenger-list">${passengerCards}</div>`:'<div class="flight-empty">Os dados dos passageiros ainda não foram cadastrados.</div>'}</section>`;
    const copyButton=document.querySelector('#copy-confirmation-code');
    if(copyButton) copyButton.addEventListener('click',async()=>{
      const feedback=document.querySelector('#copy-feedback');
      try { await navigator.clipboard.writeText(trip.confirmationCode); feedback.textContent='Localizador copiado'; }
      catch { const temporary=document.createElement('textarea'); temporary.value=trip.confirmationCode; temporary.style.position='fixed'; temporary.style.opacity='0'; document.body.appendChild(temporary); temporary.select(); const copied=document.execCommand('copy'); temporary.remove(); feedback.textContent=copied?'Localizador copiado':'Não foi possível copiar'; }
      window.setTimeout(()=>{feedback.textContent='';},2400);
    });
  }
  renderFlights();

  const placesGrid = document.querySelector('#places-grid');
  const placeFilters = { city: 'Todos', status: 'Todos', priority: 'Todas' };
  const placeStatus = place => place.status || 'Quero visitar';
  const placePriority = place => place.prioridade || 'Gostaria de ir';
  function placeImageUrl(place) {
    for (const candidate of [place?.image, place?.imageUrl]) {
      const value = String(candidate || '').trim();
      if (!value || /^(?!https?:\/\/|\/\/|\.\.?\/|\/)[a-z][a-z\d+.-]*:/i.test(value)) continue;
      try {
        const url = new URL(value, document.baseURI);
        if (['http:', 'https:', 'file:'].includes(url.protocol)) return url.href;
      } catch { /* tenta a outra propriedade de imagem */ }
    }
    return '';
  }
  const placeTags = place => Array.isArray(place.tags) ? place.tags.filter(Boolean) : String(place.tags || '').split(',').map(tag => tag.trim()).filter(Boolean);
  function placePrice(place) {
    if (place.priceValue !== '' && place.priceValue !== undefined && place.priceValue !== null && place.priceCurrency) {
      try { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: place.priceCurrency }).format(Number(place.priceValue)); }
      catch { return `${place.priceCurrency} ${place.priceValue}`; }
    }
    return place.price || '';
  }
  function updatePlaceCounters() {
    const counters = {
      visited: data.places.filter(place => placeStatus(place) === 'Visitado').length,
      planned: data.places.filter(place => placeStatus(place) === 'Planejado').length,
      pending: data.places.filter(place => placeStatus(place) === 'Quero visitar').length
    };
    Object.entries(counters).forEach(([key, value]) => {
      const counter = document.querySelector(`[data-place-count="${key}"]`);
      if (counter) counter.textContent = value;
    });
  }
  function renderPlaces() {
    const cityFilter = document.querySelector('#place-city-filter');
    const cities = [...new Set(data.places.map(place => place.city).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    if (cityFilter) {
      cityFilter.innerHTML = `<option value="Todos">Todas as cidades</option>${cities.map(city => `<option value="${escapeHtml(city)}">${escapeHtml(city)}</option>`).join('')}`;
      if (placeFilters.city !== 'Todos' && !cities.includes(placeFilters.city)) placeFilters.city = 'Todos';
      cityFilter.value = placeFilters.city;
    }
    const places = data.places.filter(place =>
      (placeFilters.city === 'Todos' || place.city === placeFilters.city) &&
      (placeFilters.status === 'Todos' || placeStatus(place) === placeFilters.status) &&
      (placeFilters.priority === 'Todas' || placePriority(place) === placeFilters.priority)
    );
    placesGrid.innerHTML = places.map(place => {
      const index = data.places.indexOf(place);
      const status = placeStatus(place);
      const priority = placePriority(place);
      const imageUrl = placeImageUrl(place);
      const tags = placeTags(place);
      const planningDetails = [
        place.bairro ? `<span class="place-detail-chip">Bairro: ${escapeHtml(place.bairro)}</span>` : '',
        place.melhorHorario ? `<span class="place-detail-chip">Melhor horário: ${escapeHtml(place.melhorHorario)}</span>` : '',
        place.tempoEstimado ? `<span class="place-detail-chip">Tempo: ${escapeHtml(place.tempoEstimado)}</span>` : '',
        place.reservaNecessaria ? `<span class="place-detail-chip">Reserva necessária: ${escapeHtml(place.reservaNecessaria)}</span>` : '',
        place.statusReserva ? `<span class="place-detail-chip">Reserva: ${escapeHtml(place.statusReserva)}</span>` : '',
        placePrice(place) ? `<span class="place-detail-chip">Valor: ${escapeHtml(String(placePrice(place)))}</span>` : ''
      ].filter(Boolean).join('');
      const tagBadges = tags.map(tag => `<span class="place-tag-badge">${escapeHtml(tag)}</span>`).join('');
      return `<article class="place-card" tabindex="0" role="button" data-place="${index}" aria-label="Ver detalhes de ${escapeHtml(place.name)}"><div class="place-art ${cityClass(place.city)} ${imageUrl ? 'has-cover' : ''}"><span class="place-art-icon">${escapeHtml(place.icon || '📍')}</span>${imageUrl ? `<img class="place-cover" src="${escapeHtml(imageUrl)}" alt="" loading="lazy">` : ''}</div><div class="place-content"><div class="place-meta"><span>${escapeHtml((place.city || '').toUpperCase())} · ${escapeHtml((place.type || '').toUpperCase())}</span><span class="place-rating">${escapeHtml(String(place.rating || ''))}</span></div><h3>${escapeHtml(place.name)}</h3><p>${escapeHtml(place.description || '')}</p><div class="place-master-details"><span class="place-master-badge place-status-${status === 'Visitado' ? 'visited' : status === 'Planejado' ? 'planned' : status === 'Cancelado' ? 'cancelled' : 'want'}">${escapeHtml(status)}</span><span class="place-master-badge place-priority">${escapeHtml(priority)}</span>${planningDetails}${tagBadges}</div><span class="place-details-hint">Ver detalhes <span>→</span></span><div class="record-actions"><button type="button" class="manage-button" data-record-action="edit" data-collection="place" data-index="${index}">Editar</button><button type="button" class="manage-button danger" data-record-action="delete" data-collection="place" data-index="${index}">Excluir</button></div></div></article>`;
    }).join('');
    placesGrid.querySelectorAll('.place-cover').forEach(image => image.addEventListener('error', () => {
      image.closest('.place-art')?.classList.remove('has-cover');
      image.remove();
    }, { once: true }));
    const total = document.querySelector('.places-total');
    if (total) total.textContent = `${places.length} de ${data.places.length} locais`;
    updatePlaceCounters();
  }
  renderPlaces();
  document.querySelector('#place-city-filter')?.addEventListener('change', event => { placeFilters.city = event.target.value; renderPlaces(); });
  document.querySelector('#place-status-filter')?.addEventListener('change', event => { placeFilters.status = event.target.value; renderPlaces(); });
  document.querySelector('#place-priority-filter')?.addEventListener('change', event => { placeFilters.priority = event.target.value; renderPlaces(); });

  const placeDialog = document.querySelector('#place-dialog');
  const placeDialogContent = document.querySelector('#place-dialog-content');
  const placeImageLightbox = document.createElement('dialog');
  placeImageLightbox.className = 'place-image-lightbox';
  placeImageLightbox.setAttribute('aria-label','Imagem ampliada do local');
  placeImageLightbox.innerHTML = '<button type="button" class="place-image-lightbox-close" aria-label="Fechar imagem ampliada">×</button><img class="place-image-lightbox-image" alt="">';
  document.body.append(placeImageLightbox);
  const placeImageLightboxImage = placeImageLightbox.querySelector('img');
  placeImageLightbox.querySelector('button').addEventListener('click',()=>placeImageLightbox.close());
  placeImageLightbox.addEventListener('click',event=>{if(event.target===placeImageLightbox)placeImageLightbox.close();});
  placeDialogContent.addEventListener('click',event=>{
    const trigger=event.target.closest('[data-expand-place-image]');
    const image=trigger?.querySelector('img');
    if(!image||!image.currentSrc&&!image.src)return;
    placeImageLightboxImage.src=image.currentSrc||image.src;
    placeImageLightboxImage.alt=image.alt||'';
    placeImageLightbox.showModal();
  });
  function itineraryDaysForPlace(placeId) {
    return data.itinerary.filter(day => (day.localIds || []).includes(placeId) || Object.values(day.periods || {}).some(period => Array.isArray(period) && period.some(entry => entry.localId === placeId)));
  }
  function openPlace(place) {
    const mapUrl = String(place.maps || '').trim();
    const savedNote = place.notes || '';
    const imageUrl = String(place.image || '').trim();
    const tags = placeTags(place).map(tag => `<span class="place-tag-badge">${escapeHtml(tag)}</span>`).join('');
    const badges = [
      place.prioridade ? `<span class="place-detail-badge priority">${escapeHtml(place.prioridade)}</span>` : '',
      place.tempoEstimado ? `<span class="place-detail-badge">${escapeHtml(place.tempoEstimado)}</span>` : '',
      place.melhorHorario ? `<span class="place-detail-badge">${escapeHtml(place.melhorHorario)}</span>` : ''
    ].filter(Boolean).join('');
    const details = [
      place.bairro ? ['Bairro',place.bairro] : null,
      place.reservaNecessaria ? ['Reserva necessária',place.reservaNecessaria] : null,
      placePrice(place) ? ['Valor',placePrice(place)] : null,
      place.openingHours ? ['Horário de funcionamento',place.openingHours] : null
    ].filter(Boolean).map(([label,value]) => `<div class="place-detail-row"><strong>${escapeHtml(label)}</strong><span>${escapeHtml(String(value))}</span></div>`).join('');
    const itineraryDays = itineraryDaysForPlace(place.id);
    const routeDays = itineraryDays.length ? `<section class="place-itinerary-presence"><strong>Presente no roteiro:</strong><div>${itineraryDays.map(day => `<span class="place-detail-chip">Dia ${String(day.day).padStart(2,'0')} · ${escapeHtml(new Date(`${day.date}T00:00:00`).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'}))} · ${escapeHtml(day.title)}</span>`).join('')}</div></section>` : '';
    const imageMarkup = imageUrl ? `<button type="button" class="dialog-image-trigger" data-expand-place-image aria-label="Ampliar imagem de ${escapeHtml(place.name)}"><img class="dialog-cover-image" src="${escapeHtml(imageUrl)}" alt="${escapeHtml(place.name)}" loading="eager"><span class="dialog-image-hint">Ampliar imagem</span></button>` : '';
    const actions = mapUrl || place.website ? `<div class="place-dialog-actions">${mapUrl ? `<a class="maps-button dialog-map" href="${escapeHtml(mapUrl)}" target="_blank" rel="noopener noreferrer"><span>↗</span> Abrir no Google Maps</a>` : ''}${place.website ? `<a class="manage-button dialog-website" href="${escapeHtml(place.website)}" target="_blank" rel="noopener noreferrer">Abrir site oficial ↗</a>` : ''}</div>` : '';
    placeDialogContent.innerHTML = `<div class="dialog-art ${cityClass(place.city)} ${imageUrl ? 'has-image' : ''}"><span class="dialog-place-icon">${escapeHtml(place.icon || '📍')}</span>${imageMarkup}</div><div class="dialog-place-meta">${place.city ? `<span class="dialog-place-city">${escapeHtml(place.city)}</span>` : ''}${place.type ? `<span class="dialog-place-category">${escapeHtml(place.type)}</span>` : ''}</div><h2 id="place-dialog-title">${escapeHtml(place.name)}</h2>${badges ? `<div class="place-detail-badges">${badges}</div>` : ''}${details ? `<div class="place-detail-grid">${details}</div>` : ''}${place.description ? `<p class="dialog-description">${escapeHtml(place.description)}</p>` : ''}${tags ? `<div class="place-dialog-tags">${tags}</div>` : ''}${routeDays}${actions}<label class="place-note-label" for="place-note">SUAS OBSERVAÇÕES</label><textarea id="place-note" class="day-notes" rows="3" placeholder="Anote dicas, horários ou o que quer lembrar...">${escapeHtml(savedNote)}</textarea><div class="notes-actions"><button class="save-notes" type="button" id="save-place-note">Salvar observações</button><span class="save-feedback" id="place-note-feedback" aria-live="polite"></span></div>`;
    const image = placeDialogContent.querySelector('.dialog-cover-image');
    image?.addEventListener('error', () => { image.closest('.dialog-image-trigger')?.remove(); placeDialogContent.querySelector('.dialog-art')?.classList.remove('has-image'); }, {once:true});
    placeDialog.showModal();
    document.querySelector('#save-place-note').addEventListener('click', () => {
      const feedback = document.querySelector('#place-note-feedback');
      try { const note = document.querySelector('#place-note').value; const placeRecord = placesById.get(place.id); if (placeRecord) placeRecord.notes = note; notifySessionChange('Observação do local aplicada'); feedback.textContent = 'Aplicada nesta sessão; edite data.js para manter'; feedback.classList.add('saved'); }
      catch { feedback.textContent = 'Não foi possível aplicar a observação'; }
    });
  }
  placesGrid.addEventListener('click', event => { const card = event.target.closest('[data-place]'); if (card && !event.target.closest('.record-actions')) openPlace(data.places[Number(card.dataset.place)]); });
  placesGrid.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { const card = event.target.closest('[data-place]'); if (card && !event.target.closest('.record-actions')) { event.preventDefault(); openPlace(data.places[Number(card.dataset.place)]); } } });
  document.querySelector('.dialog-close').addEventListener('click', () => placeDialog.close());
  placeDialog.addEventListener('click', event => { if (event.target === placeDialog) placeDialog.close(); });

  const manageDialog = document.querySelector('#manage-dialog');
  const formBody = document.querySelector('#manage-form-body');
  const fieldSets = {
    hotel: [['name','Nome'],['city','Cidade'],['area','Bairro / região'],['address','Endereço','textarea'],['checkin','Data de check-in','date'],['checkout','Data de check-out','date'],['booking','Número da Reserva'],['nearestStation','Estação mais próxima'],['stationWalkTime','Tempo andando até a estação'],['checkinTime','Check-in oficial','time'],['checkoutTime','Check-out oficial','time'],['paidAmount','Valor Pago','number'],['paymentStatus','Status do pagamento','select',['','Selecione'],['Pago','Pago'],['Pagar no hotel','Pagar no hotel'],['Parcialmente pago','Parcialmente pago']],['maps','Google Maps'],['icon','Ícone'],['notes','Observações','textarea']],
    place: [['name','Nome'],['city','Cidade'],['status','Status','select',['','Selecione'],['Quero visitar','Quero visitar'],['Planejado','Planejado'],['Visitado','Visitado'],['Cancelado','Cancelado']],['prioridade','Prioridade','select',['','Selecione'],['Imperdível','Imperdível'],['Gostaria de ir','Gostaria de ir'],['Se sobrar tempo','Se sobrar tempo']],['bairro','Bairro'],['tempoEstimado','Tempo estimado','select',['','Selecione'],['30 min','30 min'],['1h','1h'],['2h','2h'],['3h','3h'],['Meio dia','Meio dia'],['Dia inteiro','Dia inteiro']],['melhorHorario','Melhor horário','select',['','Selecione'],['Manhã','Manhã'],['Tarde','Tarde'],['Noite','Noite'],['Qualquer horário','Qualquer horário']],['reservaNecessaria','Reserva necessária','select',['','Selecione'],['Sim','Sim'],['Não','Não']],['statusReserva','Status da reserva','select',['','Selecione'],['Não reservada','Não reservada'],['Reservada','Reservada'],['Concluída','Concluída']],['priceCurrency','Moeda','select',['','Selecione'],['JPY','JPY'],['USD','USD'],['BRL','BRL']],['priceValue','Valor','number'],['tags','Tags (separadas por vírgula)','tags'],['type','Categoria'],['description','Descrição','textarea'],['maps','Google Maps'],['website','Site'],['openingHours','Horário de funcionamento'],['image','Imagem (URL)'],['icon','Ícone'],['rating','Avaliação'],['notes','Observações','textarea']],
    flight: [['direction','Direção','select',['outbound','Ida'],['return','Volta']],['segment','Trecho','number'],['airline','Companhia aérea'],['flight','Número do voo'],['travelClass','Classe da passagem','select',['','Selecione'],['Economy','Economy'],['Premium Economy','Premium Economy'],['Business','Business'],['First','First']],['date','Data','date'],['from.city','Cidade de origem'],['from.airport','Aeroporto de origem'],['from.time','Horário de partida','time'],['terminal','Terminal'],['gate','Portão'],['to.city','Cidade de destino'],['to.airport','Aeroporto de destino'],['to.time','Horário de chegada','time'],['seat','Assento'],['meals','Refeições (separadas por vírgula)'],['notes','Observações','textarea']],
    passenger: [['name','Nome'],['ticketNumber','Número do bilhete'],['passport','Passaporte'],['nationality','Nacionalidade'],['passportExpiry','Validade do passaporte','date'],['notes','Observações','textarea']],
    task: [['text','Próximo passo'],['done','Concluído','checkbox'],['tag','Etiqueta']]
  };
  function flightFieldSections(record) {
    const fields = new Map(fieldSets.flight.map(field => [field[0],field]));
    const groups = [
      ['INFORMAÇÕES DO VOO',['direction','segment','airline','flight','travelClass','date']],
      ['ORIGEM',['from.city','from.airport','from.time','terminal','gate']],
      ['DESTINO',['to.city','to.airport','to.time']],
      ['PASSAGEIRO',['seat']],
      ['EXTRAS',['meals','notes']]
    ];
    return groups.map(([title,keys]) => `<section class="flight-form-section"><h3>${title}</h3><div class="flight-form-fields">${keys.map(key=>renderField(fields.get(key),record)).join('')}</div></section>`).join('');
  }
    let formContext = null;
  function valueAt(record, path) { return path.split('.').reduce((value,key) => value?.[key],record); }
  function makeId(prefix) { let id; do { id=`${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`; } while(prefix==='place'&&placesById.has(id)); return id; }
  function renderField(field, record = {}) {
    const [key,label,type='text',...options] = field; let value = valueAt(record,key) ?? ''; if (key === 'image') value = value || valueAt(record,'imageUrl') || ''; if (key === 'meals' && Array.isArray(value)) value=value.join(', '); if (key === 'checkinTime' && !value && /^\d{2}:\d{2}$/.test(String(record.checkin || ''))) value=record.checkin; if (key === 'checkoutTime' && !value && /^\d{2}:\d{2}$/.test(String(record.checkout || ''))) value=record.checkout;
    if (type === 'checkbox') return `<label class="manage-field check-field"><input name="${key}" type="checkbox" ${value ? 'checked' : ''}><span>${label}</span></label>`;
    if (type === 'textarea') return `<label class="manage-field wide-field"><span>${label}</span><textarea name="${key}" rows="3">${escapeHtml(String(value))}</textarea></label>`;
    if (type === 'tags') return `<label class="manage-field wide-field"><span>${label}</span><input name="${key}" type="text" value="${escapeHtml(Array.isArray(value) ? value.join(', ') : String(value))}" placeholder="Ex.: arquitetura, comida, compras"></label>`;
    if (type === 'select') {
      const selectOptions = key === 'tempoEstimado' && value && !options.some(([option]) => option === value) ? [[value, `${value} (atual)`], ...options] : options;
      return `<label class="manage-field"><span>${label}</span><select name="${key}">${selectOptions.map(([option,text]) => `<option value="${escapeHtml(option)}" ${value === option ? 'selected' : ''}>${escapeHtml(text)}</option>`).join('')}</select></label>`;
    }
    const numericAttributes = key === 'priceValue' ? 'min="0" step="any"' : '';
    return `<label class="manage-field"><span>${label}</span><input name="${key}" type="${type}" value="${escapeHtml(String(value))}" ${numericAttributes}></label>`;
  }
  function openEditor(collection, index = null) {
    const isTrip = collection === 'trip';
    const records = {hotel:data.hotels,place:data.places,flight:data.trip.flights,passenger:data.trip.passengers,task:data.tasks};
    const record = isTrip ? data.trip : (index === null ? {} : records[collection][index]);
    formContext = {collection,index};
    const fields = isTrip ? [['id','ID'],['confirmationCode','Localizador'],['airline','Companhia aérea']] : fieldSets[collection];
    formBody.dataset.datesTouched = 'false';
    const hotelPreview = collection === 'hotel' ? `<section class="hotel-live-preview" aria-live="polite"><span class="hotel-preview-eyebrow">PRÉ-VISUALIZAÇÃO</span><div class="hotel-preview-card"><div class="hotel-preview-icon">${escapeHtml(record.icon || '🏨')}</div><div class="hotel-preview-main"><h3 data-preview="name">${escapeHtml(record.name || 'Nome da hospedagem')}</h3><p data-preview="city">📍 ${escapeHtml(record.city || 'Cidade')}</p><p data-preview="dates">📅 ${escapeHtml(record.dates || 'Datas de check-in e check-out')}</p><p data-preview="station">🚇 ${escapeHtml(record.nearestStation || 'Estação mais próxima')}${record.stationWalkTime ? ` · ${escapeHtml(record.stationWalkTime)}` : ''}</p><p data-preview="booking">🔖 ${escapeHtml(record.booking || 'Número da reserva')}</p><p data-preview="payment">💰 ${escapeHtml(record.paymentStatus || 'Status do pagamento')}${record.paidAmount ? ` · R$ ${escapeHtml(String(record.paidAmount))}` : ''}</p></div></div></section>` : '';
    const initialPlaceImage = collection === 'place' ? placeImageUrl(record) : '';
    const placePreview = collection === 'place' ? `<section class="place-live-preview" aria-live="polite"><span class="hotel-preview-eyebrow">PRÉ-VISUALIZAÇÃO DO LOCAL</span><div class="place-preview-card"><div class="place-preview-art ${initialPlaceImage ? 'has-cover' : ''}" data-place-preview-art><span data-place-preview-icon>${escapeHtml(record.icon || '📍')}</span><img data-place-preview-image alt="" ${initialPlaceImage ? `src="${escapeHtml(initialPlaceImage)}"` : 'hidden'}></div><div class="place-preview-main"><h3 data-place-preview-name>${escapeHtml(record.name || 'Nome do local')}</h3><p data-place-preview-city>${escapeHtml(record.city || 'Cidade')}</p></div></div></section>` : '';
    const fieldsMarkup = collection === 'flight' ? flightFieldSections(record) : `<div class="manage-fields">${fields.map(field => renderField(field,record)).join('')}</div>`;
    formBody.innerHTML = `<header class="manage-form-heading"><span>GERENCIAR VIAGEM</span><h2 id="manage-dialog-title">${index === null && !isTrip ? 'Adicionar' : 'Editar'} ${isTrip ? 'reserva' : ({hotel:'hotel',place:'local',flight:'trecho',passenger:'passageiro',task:'próximo passo'}[collection])}</h2></header>${fieldsMarkup}${hotelPreview}${placePreview}`;
    if (collection === 'place') {
      const updatePlacePreview = () => {
        const previewName = formBody.querySelector('[data-place-preview-name]');
        const previewCity = formBody.querySelector('[data-place-preview-city]');
        const previewImage = formBody.querySelector('[data-place-preview-image]');
        const previewArt = formBody.querySelector('[data-place-preview-art]');
        previewName.textContent = formBody.querySelector('[name="name"]')?.value.trim() || 'Nome do local';
        previewCity.textContent = formBody.querySelector('[name="city"]')?.value.trim() || 'Cidade';
        const url = placeImageUrl({ image: formBody.querySelector('[name="image"]')?.value || formBody.querySelector('[name="imageUrl"]')?.value });
        previewImage.hidden = !url;
        if (url) { previewImage.src = url; previewArt.classList.add('has-cover'); }
        else { previewImage.removeAttribute('src'); previewArt.classList.remove('has-cover'); }
      };
      const previewImage = formBody.querySelector('[data-place-preview-image]');
      previewImage.addEventListener('error', () => {
        previewImage.hidden = true;
        formBody.querySelector('[data-place-preview-art]').classList.remove('has-cover');
      });
      formBody.querySelectorAll('[name="name"],[name="city"],[name="image"],[name="imageUrl"]').forEach(input => input.addEventListener('input', updatePlacePreview));
      updatePlacePreview();
    }
    if (collection === 'hotel') {
      const field = name => formBody.querySelector(`[name="${name}"]`);
      const value = name => field(name)?.value.trim() || '';
      const updatePreview = () => {
        const name=value('name') || 'Nome da hospedagem';
        const city=value('city') || 'Cidade';
        const start=value('checkin'), end=value('checkout');
        const dates = start || end ? `${formatHotelDate(start) || '—'} → ${formatHotelDate(end) || '—'}` : (formBody.dataset.datesTouched === 'true' ? 'Datas de check-in e check-out' : (record.dates || 'Datas de check-in e check-out'));
        const station=value('nearestStation') || 'Estação mais próxima';
        const walk=value('stationWalkTime');
        const booking=value('booking') || 'Número da reserva';
        const payment=value('paymentStatus') || 'Status do pagamento';
        const amount=value('paidAmount');
        formBody.querySelector('[data-preview="name"]').textContent=name;
        formBody.querySelector('[data-preview="city"]').textContent=`📍 ${city}`;
        formBody.querySelector('[data-preview="dates"]').textContent=`📅 ${dates}`;
        formBody.querySelector('[data-preview="station"]').textContent=`🚇 ${station}${walk ? ` · ${walk}` : ''}`;
        formBody.querySelector('[data-preview="booking"]').textContent=`🔖 ${booking}`;
        formBody.querySelector('[data-preview="payment"]').textContent=`💰 ${payment}${amount ? ` · ${new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(amount))}` : ''}`;
      };
      formBody.querySelectorAll('input,textarea,select').forEach(input => {
        input.addEventListener('input', () => { if (input.name === 'checkin' || input.name === 'checkout') { formBody.dataset.datesTouched='true'; input.dataset.edited='true'; } updatePreview(); });
        input.addEventListener('change', () => { if (input.name === 'checkin' || input.name === 'checkout') { formBody.dataset.datesTouched='true'; input.dataset.edited='true'; } updatePreview(); });
      });
      updatePreview();
    }
    manageDialog.showModal();
    formBody.querySelector('input:not([type=checkbox]),textarea,select')?.focus();
  }
  function assignPath(target,path,value) { const parts=path.split('.'); const key=parts.pop(); let node=target; parts.forEach(part => node=node[part] ||= {}); node[key]=value; }
  document.querySelectorAll('[data-close-manage]').forEach(button => button.addEventListener('click', () => manageDialog.close()));
  manageDialog.addEventListener('click', event => { if (event.target === manageDialog) manageDialog.close(); });
  document.querySelector('#manage-form').addEventListener('submit', event => {
    event.preventDefault(); if (!formContext) return;
    const {collection,index}=formContext; const form=new FormData(event.currentTarget); const isTrip=collection==='trip';
    const record=isTrip ? {...data.trip} : (index===null ? {} : clone(({hotel:data.hotels,place:data.places,flight:data.trip.flights,passenger:data.trip.passengers,task:data.tasks})[collection][index]));
    const fields=isTrip ? [['id'],['confirmationCode'],['airline']] : fieldSets[collection];
    fields.forEach(([key,,type]) => {
      if (type==='checkbox') { assignPath(record,key,form.has(key)); return; }
      let value=form.get(key) ?? '';
      if (type==='number') value=value==='' ? '' : Number(value);
      if (key==='meals') value=String(value).split(',').map(item=>item.trim()).filter(Boolean);
      if (key==='tags') value=[...new Map(String(value).split(',').map(tag=>tag.trim()).filter(Boolean).map(tag=>[tag.toLocaleLowerCase(),tag])).values()];
      assignPath(record,key,value);
    });
    if (collection==='hotel') {
      if (!record.id) record.id=makeId('hotel');
      const start=String(form.get('checkin') || ''); const end=String(form.get('checkout') || '');
      if (formBody.dataset.datesTouched==='true' || start || end) record.dates=[formatHotelDate(start),formatHotelDate(end)].filter(Boolean).join(' → ');
      if (/^\d{2}:\d{2}$/.test(String(record.checkin || ''))) record.checkin='';
      if (/^\d{2}:\d{2}$/.test(String(record.checkout || ''))) record.checkout='';
    }
    if (collection==='place') {
      if (!record.id) record.id=makeId('place');
    }
    if (collection==='task' && !record.id) record.id=makeId('task');
    if (collection==='flight' && !record.segment) record.segment=data.trip.flights.filter(item=>item.direction===record.direction).length+1;
    if (isTrip) data.trip=record;
    else { const list=({hotel:data.hotels,place:data.places,flight:data.trip.flights,passenger:data.trip.passengers,task:data.tasks})[collection]; if(index===null) list.push(record); else list[index]=record; }
    notifySessionChange(); refreshDataViews(); manageDialog.close(); formContext=null;
  });
  function refreshDataViews() {
    rebuildPlacesById();
    validateTravelData();
    renderHotels(); renderFlights();
    renderPlaces();
    renderTasks(); syncSummaryCounts(); renderDashboard();
  }
  function syncSummaryCounts() {
    const stats=document.querySelectorAll('.stats-grid .stat-card > strong');
    if(stats[1]) stats[1].innerHTML=`${data.hotels.length} <small>estadias</small>`;
    if(stats[2]) stats[2].innerHTML=`${data.trip.flights.length} <small>trechos</small>`;
    if(stats[3]) stats[3].innerHTML=`${data.places.length} <small>locais</small>`;
  }
  function renderTasks() {
    taskRoot.innerHTML=data.tasks.map((task,index)=>`<div class="task-row"><label class="task-main"><input type="checkbox" data-task-index="${index}" ${task.done?'checked':''}><span class="task-check">${task.done?'✓':''}</span><span class="task-text ${task.done?'completed':''}">${escapeHtml(task.text)}</span><span class="task-tag ${task.done?'done-tag':''}">${escapeHtml(task.done?'FEITO':(task.tag==='FEITO'?'ANTES DA VIAGEM':(task.tag||'ANTES DA VIAGEM')))}</span></label><div class="record-actions"><button type="button" class="manage-button" data-record-action="edit" data-collection="task" data-index="${index}">Editar</button><button type="button" class="manage-button danger" data-record-action="delete" data-collection="task" data-index="${index}">Excluir</button></div></div>`).join('');
    const done=data.tasks.filter(task=>task.done).length; document.querySelector('.progress-count').textContent=`${done} de ${data.tasks.length}`; document.querySelector('.progress-track span').style.width=`${data.tasks.length?done/data.tasks.length*100:0}%`;
  }
  document.addEventListener('click', event => {
    const add=event.target.closest('[data-add]'); if(add){openEditor(add.dataset.add);return;}
    const editTrip=event.target.closest('[data-edit-trip]'); if(editTrip){openEditor('trip');return;}
    const action=event.target.closest('[data-record-action]'); if(!action)return;
    const collection=action.dataset.collection,index=Number(action.dataset.index);
    if(action.dataset.recordAction==='edit'){openEditor(collection,index);return;}
    const labels={hotel:'hotel',place:'local',flight:'trecho',passenger:'passageiro',task:'próximo passo'};
    if(!window.confirm(`Excluir este ${labels[collection]}?`))return;
    const list=({hotel:data.hotels,place:data.places,flight:data.trip.flights,passenger:data.trip.passengers,task:data.tasks})[collection];
    if(collection==='place')unlinkPlaceFromDays(list[index].id);
    list.splice(index,1); notifySessionChange('Item excluído'); refreshDataViews();
  });
  taskRoot.addEventListener('change', event => {
    const input=event.target.closest('[data-task-index]'); if(!input)return;
    const task=data.tasks[Number(input.dataset.taskIndex)]; task.done=input.checked; notifySessionChange('Próximos passos atualizados'); renderTasks();
  });
  function displayTripDate(value, includeYear = false) {
    if (!value) return '';
    const date = new Date(`${value}T00:00:00`);
    const formatted = date.toLocaleDateString('pt-BR',{day:'2-digit',month:'short'}).replace('.','');
    return includeYear ? `${formatted}, ${date.getFullYear()}` : formatted;
  }
  function renderDashboard() {
    const days=[...data.itinerary].sort((a,b)=>a.date.localeCompare(b.date));
    const cities=[...new Set(days.map(day=>day.city))];
    const firstDate=days[0]?.date || '';
    const lastDate=days[days.length-1]?.date || firstDate;
    const year=data.trip.year || Number(firstDate.slice(0,4));
    const destination=data.trip.destination;
    const dateRange=`${displayTripDate(firstDate)} — ${displayTripDate(lastDate, true)}`;
    const outbound=data.trip.flights.filter(flight=>flight.direction==='outbound').sort((a,b)=>a.segment-b.segment);
    const returning=data.trip.flights.filter(flight=>flight.direction==='return'||flight.direction==='inbound').sort((a,b)=>a.segment-b.segment);
    const firstFlight=outbound[0],lastOutbound=outbound[outbound.length-1],firstReturn=returning[0],lastReturn=returning[returning.length-1];
    const airRoute=firstFlight&&lastOutbound?`${firstFlight.from.airport} ⇄ ${lastOutbound.to.airport}`:'';
    const connections=[...outbound.slice(0,-1),...returning.slice(0,-1)].map(flight=>flight.to.airport);
    const uniqueConnections=[...new Set(connections)];
    const picker=document.querySelector('.trip-picker .trip-label');
    document.querySelector('.trip-picker .trip-flag').textContent=data.trip.flag;
    if(picker){picker.querySelector('strong').textContent=destination;picker.querySelector('small').textContent=dateRange;}
    const profile=document.querySelector('.profile small'); if(profile)profile.textContent=`${destination} · ${year}`;
    const heroHeading=document.querySelector('.hero-heading');
    heroHeading.querySelector('h1').innerHTML=`${escapeHtml(destination)} <span class="year">${escapeHtml(String(year))}</span>`;
    heroHeading.querySelector('.subtitle').textContent=`${cities.join(', ')} — ${days.length} dias`;
    heroHeading.querySelector('.date-chip').innerHTML=`◷ &nbsp;${escapeHtml(dateRange.toLocaleUpperCase('pt-BR'))}`;
    const heroImage=document.querySelector('.hero-image');
    heroImage.setAttribute('aria-label',`Viagem para ${destination}`);
    heroImage.querySelector('.image-kicker').textContent=`SUA VIAGEM AO ${destination.toLocaleUpperCase('pt-BR')}`;
    heroImage.querySelector('.hero-location').textContent=`◉ ${destination}`;
    const facts=[dateRange,`${days.length} dias`,cities.join(' · '),`${airRoute}${uniqueConnections.length?` · via ${uniqueConnections.join(', ')}`:''}`];
    document.querySelectorAll('.trip-fact strong').forEach((node,index)=>{if(facts[index]!==undefined)node.textContent=facts[index];});
    const statCards=[...document.querySelectorAll('.stats-grid .stat-card')];
    if(statCards[0]){
      statCards[0].querySelector(':scope > strong').innerHTML=`${days.length} <small>dias</small>`;
      statCards[0].querySelector('.mini-route span').textContent=cities.join(' → ');
      statCards[0].querySelector('.stat-foot').textContent=`${displayTripDate(firstDate)} — ${displayTripDate(lastDate)}`;
    }
    if(statCards[1]){
      statCards[1].querySelector(':scope > strong').innerHTML=`${data.hotels.length} <small>estadias</small>`;
      statCards[1].querySelector('.stat-foot').textContent=cities.join(' · ');
    }
    if(statCards[2]){
      statCards[2].querySelector(':scope > strong').innerHTML=`${data.trip.flights.length} <small>trechos</small>`;
      statCards[2].querySelector('.stat-caption').textContent=`${outbound.length} ida · ${returning.length} volta · ${uniqueConnections.length} conexões`;
      statCards[2].querySelector('.stat-foot').textContent=`${data.trip.airline} · ${airRoute}`;
    }
    if(statCards[3]){
      statCards[3].querySelector(':scope > strong').innerHTML=`${data.places.length} <small>locais</small>`;
      statCards[3].querySelector('.stat-foot').textContent=`Distribuídos em ${new Set(data.places.map(place=>place.city)).size} cidades`;
    }
    const returnRoute=[firstReturn,...returning.slice(1)].filter(Boolean).map(flight=>flight.from.airport).concat(lastReturn?.to.airport||[]).join(' → ');
    const routeList=document.querySelector('.route-list');
    routeList.innerHTML=cities.map((city,index)=>{
      const cityDays=days.filter(day=>day.city===city);
      const placeIds=[...new Set(cityDays.flatMap(day=>day.localIds))];
      const placeNames=placeIds.map(id=>placesById.get(id)?.name).filter(Boolean).slice(0,3).join(' · ');
      const period=`${displayTripDate(cityDays[0]?.date).toLocaleUpperCase('pt-BR')} — ${displayTripDate(cityDays[cityDays.length-1]?.date).toLocaleUpperCase('pt-BR')}`;
      return `<div class="route-item"><div class="route-marker ${cityClass(city)}-marker">${String(index+1).padStart(2,'0')}</div><div class="route-info"><strong>${escapeHtml(city)}</strong><span>${escapeHtml(placeNames)}</span></div><span class="route-date">${escapeHtml(period)}</span></div><div class="route-connector"></div>`;
    }).join('')+`<div class="route-item return-route-item"><div class="route-marker return-marker">✈</div><div class="route-info"><strong>Retorno</strong><span>${escapeHtml(returnRoute)}</span></div><span class="route-date">${escapeHtml(displayTripDate(lastReturn?.date||lastDate).toLocaleUpperCase('pt-BR'))}</span></div>`;
    const itineraryHeading=document.querySelector('#page-roteiro .page-heading .subtitle');
    if(itineraryHeading)itineraryHeading.textContent=`${days.length} dias para descobrir ${destination} no seu ritmo.`;
    const tabs=document.querySelector('.itinerary-controls .tabs');
    tabs.innerHTML=`<button class="tab active" data-city="todos">Todos os dias <span>${days.length}</span></button>${cities.map(city=>`<button class="tab" data-city="${escapeHtml(city)}">${escapeHtml(city)} <span>${days.filter(day=>day.city===city).length}</span></button>`).join('')}`;
    document.title=`TravelHub — ${destination} ${year}`;
    document.querySelector('meta[name="description"]').content=`Guia pessoal da viagem para ${destination} em ${year}.`;
    const tripStart=new Date(`${firstFlight?.date||firstDate}T00:00:00`);
    document.querySelector('#days-left').textContent=Math.max(0,Math.ceil((tripStart-new Date())/86400000));
    document.querySelector('.countdown p strong').textContent=`partida de ${firstFlight?.from.airport||''}`;
  }
  renderDashboard();
  renderTasks();
  goToPage(location.hash.slice(1) || 'dashboard');
})();
