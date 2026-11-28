import { CITY_LIST, WEATHER_INTERVAL, pickCity, cityWeather, fetchCityWeather } from './weather.js';

const PHASE_LABELS = { dawn: '清晨', day: '白天', dusk: '黃昏', night: '晚上' };
const DEMOS = {
  day: { phase: 'day', sunUp: true, solar: 0.52, cloud: 0.13, raining: false, rain: 0 },
  night: { phase: 'night', sunUp: false, solar: 1, cloud: 0.12, raining: false, rain: 0 },
  rain: { phase: 'day', sunUp: true, solar: 0.68, cloud: 0.98, raining: true, rain: 1.5 },
};

export function initWeatherControls({ $, scene, closeCards, preview, storeKey }) {
  const button = $('weather-open');
  const panel = $('weather-card');
  const select = $('weather-city');
  const attempts = new Map();
  const samples = new Map();
  const demoButtons = [...$('weather-demo').querySelectorAll('[data-weather-demo]')];
  let city = pickCity();
  try { city = pickCity(localStorage.getItem(storeKey)); } catch { /* The city stays selected while this page is open. */ }
  let demo = '';
  let request = null;
  let failed = false;

  for (const optionCity of CITY_LIST) select.add(new Option(optionCity.name, optionCity.id));
  select.value = city.id;
  $('weather-demo').hidden = !preview;

  function paint() {
    const state = cityWeather(city, samples.get(city.id));
    const demoState = demo ? DEMOS[demo] : null;
    scene.setWeather(demoState || state);
    $('weather-local').textContent = city.name + ' ' + state.localTime + ' · ' + PHASE_LABELS[state.phase];
    const label = demoState ? '效果示範' : state.raining ? '下雨' : state.fresh ? state.cloud >= 0.6 ? '多雲' : '晴朗' : '';
    $('weather-condition').textContent = label;
    const feedback = demoState ? '正在看示範。' : !state.fresh
      ? failed ? '暫時讀不到雨況，先顯示這座城市的日夜。' : '正在讀取這座城市的雨況…'
      : failed ? '這次更新失敗，先顯示最近一次的雨況。' : '';
    if ($('weather-feedback').textContent !== feedback) $('weather-feedback').textContent = feedback;
    $('weather-retry').hidden = !failed || !!demoState;
    $('weather-live').hidden = !demoState;
    button.setAttribute('aria-label', '島上天氣，' + city.name + (label ? '，' + label : ''));
    for (const option of demoButtons) option.setAttribute('aria-pressed', String(option.dataset.weatherDemo === demo));
  }

  function cancelRequest() {
    if (!request) return;
    request.abort();
    request = null;
  }

  async function refresh(force = false) {
    if (demo || request || document.hidden) return;
    const now = Date.now();
    const delay = samples.has(city.id) && !failed ? WEATHER_INTERVAL : 5 * 60 * 1000;
    if (!force && now - (attempts.get(city.id) ?? -Infinity) < delay) return;
    const requestedCity = city;
    const controller = new AbortController();
    request = controller;
    attempts.set(city.id, now);
    const timeout = setTimeout(() => controller.abort(), 9000);
    try {
      const sample = await fetchCityWeather(requestedCity, controller.signal);
      if (request !== controller) return;
      if (!cityWeather(requestedCity, sample).fresh) throw new Error('Weather conditions are out of date');
      samples.set(requestedCity.id, sample);
      failed = false;
    } catch {
      if (request !== controller) return;
      failed = true;
    } finally {
      clearTimeout(timeout);
      if (request === controller) {
        request = null;
        paint();
      }
    }
  }

  button.addEventListener('click', () => {
    const open = panel.hidden;
    closeCards();
    if (!open) return;
    panel.hidden = false;
    button.setAttribute('aria-expanded', 'true');
    paint();
    refresh();
  });
  select.addEventListener('change', () => {
    cancelRequest();
    city = pickCity(select.value);
    demo = '';
    failed = false;
    try { localStorage.setItem(storeKey, city.id); } catch { /* Keep the in-page selection. */ }
    paint();
    refresh(!samples.has(city.id));
  });
  for (const option of demoButtons) option.addEventListener('click', () => {
    cancelRequest();
    demo = option.dataset.weatherDemo;
    paint();
  });
  $('weather-live').addEventListener('click', () => {
    demo = '';
    paint();
    refresh(true);
  });
  $('weather-retry').addEventListener('click', () => refresh(true));
  const update = () => {
    if (document.hidden) return;
    paint();
    refresh();
  };
  const clock = setInterval(update, 30000);
  document.addEventListener('visibilitychange', update);
  window.addEventListener('pagehide', () => {
    clearInterval(clock);
    document.removeEventListener('visibilitychange', update);
    cancelRequest();
  }, { once: true });
  paint();
  refresh();
}
