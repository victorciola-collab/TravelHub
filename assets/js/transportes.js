(() => {
  'use strict';
  const root = document.querySelector('#arrival-guide');
  if (!root) return;
  const storageKey = root.hasAttribute('data-offline')
    ? 'travelhub-arrival-narita-2026-offline-v1'
    : 'travelhub-arrival-narita-2026-v1';
  const checks = [...root.querySelectorAll('[data-arrival-check]')];
  const validIds = new Set(checks.map(check => check.dataset.arrivalCheck));
  const storageMessage = root.querySelector('[data-arrival-storage]');
  const savedMessage = storageMessage.textContent;
  let completed = new Set();
  const storageUnavailable = () => {
    storageMessage.textContent = 'O navegador bloqueou o armazenamento. O checklist funciona nesta sessão, mas o progresso não será preservado ao fechar.';
  };
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
    if (Array.isArray(saved)) completed = new Set(saved.filter(id => validIds.has(id)));
  } catch { storageUnavailable(); }
  function update() {
    checks.forEach(check => { check.checked = completed.has(check.dataset.arrivalCheck); });
    const count = completed.size;
    const percent = Math.round(count / checks.length * 100);
    const progress = root.querySelector('[data-arrival-progress]');
    progress.value = count;
    progress.textContent = `${count} de ${checks.length}`;
    root.querySelector('[data-arrival-progress-label]').textContent = `${count} de ${checks.length} concluídos · ${percent}%`;
  }
  function persist() {
    try {
      localStorage.setItem(storageKey, JSON.stringify([...completed]));
      storageMessage.textContent = savedMessage;
    } catch { storageUnavailable(); }
    update();
  }
  root.addEventListener('change', event => {
    if (!event.target.matches('[data-arrival-check]')) return;
    const id = event.target.dataset.arrivalCheck;
    if (event.target.checked) completed.add(id); else completed.delete(id);
    persist();
  });
  root.querySelector('[data-reset-arrival]').addEventListener('click', () => {
    if (!window.confirm('Reiniciar todos os itens de Minha chegada ao Japão?')) return;
    completed.clear();
    persist();
  });
  root.querySelectorAll('[data-arrival-jump]').forEach(button => {
    button.addEventListener('click', () => {
      const target = document.getElementById(button.dataset.arrivalJump);
      if (!target) return;
      target.focus({ preventScroll: true });
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
  const address = 'APA Hotel Asakusa Kuramae Kita / アパホテル〈浅草 蔵前北〉\n東京都台東区駒形2-4-10\n2-4-10 Komagata, Taito-ku, Tokyo 111-0043';
  root.querySelector('[data-copy-arrival-address]').addEventListener('click', async () => {
    const feedback = root.querySelector('[data-copy-feedback]');
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(address);
      feedback.textContent = 'Endereço copiado.';
    } catch {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(root.querySelector('.arrival-address'));
      selection.removeAllRanges();
      selection.addRange(range);
      feedback.textContent = 'Cópia automática indisponível. O endereço foi selecionado; mantenha o toque para copiar ou mostre-o na tela.';
    }
  });
  // Read flight data only. The guide must never modify the trip's records.
  const arrivals = window.TRAVEL_DATA?.trip?.flights?.filter(flight => flight.to?.airport === 'NRT' && flight.direction === 'outbound') || [];
  const note = root.querySelector('[data-arrival-flight]');
  if (!root.hasAttribute('data-offline') && (arrivals.length !== 1 || arrivals[0].flight !== 'AA61' || arrivals[0].to.time !== '15:30')) {
    note.textContent = arrivals.length === 1
      ? `O cadastro atual informa ${arrivals[0].flight || 'voo sem número'} (${arrivals[0].from?.airport || '?'} → NRT), com chegada às ${arrivals[0].to.time || 'horário não informado'}. Este guia foi preparado para AA61/American e usa 16h45, conforme solicitado. Terminal 2 é a referência oficial da American, não uma confirmação deste novo cadastro. Reconfirme companhia, terminal e horário antes de usar as instruções.`
      : 'Não foi possível identificar um único voo de ida para NRT no cadastro atual. Este guia usa a chegada solicitada às 16h45 e a referência AA61/American no Terminal 2. Confirme os dados do voo antes de seguir o guia.';
  }
  window.addEventListener('storage', event => {
    if (event.key !== storageKey && event.key !== null) return;
    try {
      const saved = JSON.parse(event.key === null ? '[]' : event.newValue || '[]');
      completed = new Set(Array.isArray(saved) ? saved.filter(id => validIds.has(id)) : []);
      update();
    } catch { /* Ignore invalid changes from another tab. */ }
  });
  update();
})();
