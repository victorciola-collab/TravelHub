(() => {
  const loaderUrl = document.currentScript.src;
  const placesUrl = new URL('../../places-japan-2026.json', loaderUrl);
  const appUrl = new URL('./app.js', loaderUrl);

  function showLoadError(error) {
    console.error('[TravelHub] Não foi possível carregar os dados dos locais.', error);
    const notice = document.createElement('div');
    notice.setAttribute('role', 'alert');
    notice.textContent = 'Não foi possível carregar os locais da viagem. Verifique sua conexão e tente atualizar a página.';
    Object.assign(notice.style, {
      position: 'fixed',
      zIndex: '10000',
      left: '16px',
      right: '16px',
      bottom: '16px',
      padding: '16px',
      border: '1px solid #6f3940',
      borderRadius: '12px',
      background: '#241619',
      color: '#fff',
      font: '16px/1.5 system-ui, sans-serif'
    });
    document.body.append(notice);
  }

  async function initialize() {
    const response = await fetch(placesUrl, { cache: 'no-cache' });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ao carregar ${placesUrl.pathname}`);
    }

    const places = await response.json();
    if (!Array.isArray(places)) {
      throw new Error('places-japan-2026.json deve conter um array.');
    }

    const ids = new Set();
    places.forEach((place, index) => {
      if (!place || typeof place.id !== 'string' || !place.id.trim()) {
        throw new Error(`Local na posição ${index} sem ID válido.`);
      }
      if (!place.name || !place.city) {
        throw new Error(`Local ${place.id} sem name ou city.`);
      }
      if (ids.has(place.id)) {
        throw new Error(`ID de Local duplicado: ${place.id}.`);
      }
      ids.add(place.id);
    });

    if (!window.TRAVEL_DATA || typeof window.TRAVEL_DATA !== 'object') {
      throw new Error('TRAVEL_DATA não foi inicializado por data.js.');
    }
    window.TRAVEL_DATA.places = places;

    await new Promise((resolve, reject) => {
      const appScript = document.createElement('script');
      appScript.src = appUrl.href;
      appScript.onload = resolve;
      appScript.onerror = () => reject(new Error('Não foi possível carregar app.js.'));
      document.body.append(appScript);
    });
  }

  initialize().catch(showLoadError);
})();
