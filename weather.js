export const CITY_LIST = [
  { id: 'taipei', name: '台北', latitude: 25.04, longitude: 121.56, timezone: 'Asia/Taipei' },
  { id: 'taoyuan', name: '桃園', latitude: 24.99, longitude: 121.30, timezone: 'Asia/Taipei' },
  { id: 'hsinchu', name: '新竹', latitude: 24.81, longitude: 120.97, timezone: 'Asia/Taipei' },
  { id: 'taichung', name: '台中', latitude: 24.15, longitude: 120.67, timezone: 'Asia/Taipei' },
  { id: 'tainan', name: '台南', latitude: 22.99, longitude: 120.20, timezone: 'Asia/Taipei' },
  { id: 'kaohsiung', name: '高雄', latitude: 22.63, longitude: 120.30, timezone: 'Asia/Taipei' },
  { id: 'hualien', name: '花蓮', latitude: 23.99, longitude: 121.60, timezone: 'Asia/Taipei' },
  { id: 'tokyo', name: '東京', latitude: 35.68, longitude: 139.69, timezone: 'Asia/Tokyo' },
  { id: 'singapore', name: '新加坡', latitude: 1.29, longitude: 103.85, timezone: 'Asia/Singapore' },
  { id: 'sydney', name: '雪梨', latitude: -33.87, longitude: 151.21, timezone: 'Australia/Sydney' },
  { id: 'london', name: '倫敦', latitude: 51.51, longitude: -0.13, timezone: 'Europe/London' },
  { id: 'new-york', name: '紐約', latitude: 40.71, longitude: -74.01, timezone: 'America/New_York' },
];

export const WEATHER_INTERVAL = 15 * 60 * 1000;
const MAX_SAMPLE_AGE = 45 * 60 * 1000;
const TWILIGHT_MINUTES = 35;
const RAIN_CODES = new Set([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99]);
const WEATHER_API = 'https://api.open-meteo.com/v1/forecast';
const clocks = new Map();

export function pickCity(id) {
  return CITY_LIST.find((city) => city.id === id) ?? CITY_LIST[0];
}

function cityParts(timezone, time) {
  if (!clocks.has(timezone)) {
    clocks.set(timezone, new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }));
  }
  const parts = Object.fromEntries(clocks.get(timezone).formatToParts(time).map(({ type, value }) => [type, value]));
  return { date: parts.year + parts.month + parts.day, clock: parts.hour + ':' + parts.minute, minute: Number(parts.hour) * 60 + Number(parts.minute) };
}

export function readWeather(payload) {
  const current = payload?.current;
  if (!Number.isFinite(current?.time) || !Number.isInteger(current.weather_code)) return null;
  const sunrise = payload.daily?.sunrise?.[0];
  const sunset = payload.daily?.sunset?.[0];
  const rain = Math.max(0, Number(current.rain) || 0) + Math.max(0, Number(current.showers) || 0);
  const cloud = Number.isFinite(current.cloud_cover) ? Math.max(0, Math.min(current.cloud_cover, 100)) / 100 : 0.2;
  return {
    at: current.time * 1000,
    sunrise: Number.isFinite(sunrise) ? sunrise * 1000 : null,
    sunset: Number.isFinite(sunset) ? sunset * 1000 : null,
    raining: rain > 0 || RAIN_CODES.has(current.weather_code),
    rain,
    cloud,
  };
}

export function cityWeather(city, sample, now = Date.now()) {
  const local = cityParts(city.timezone, now);
  const fresh = !!sample && now - sample.at <= MAX_SAMPLE_AGE && sample.at <= now + WEATHER_INTERVAL;
  const localToday = sample?.sunrise && cityParts(city.timezone, sample.sunrise).date === local.date;
  const realSun = localToday && sample.sunset > sample.sunrise;
  const sinceRise = realSun ? (now - sample.sunrise) / 60000 : local.minute - 360;
  const untilSet = realSun ? (sample.sunset - now) / 60000 : 1080 - local.minute;
  const sunUp = sinceRise >= 0 && untilSet > 0;
  const nearRise = Math.abs(sinceRise) < TWILIGHT_MINUTES;
  const nearSet = Math.abs(untilSet) < TWILIGHT_MINUTES;
  const phase = nearRise ? 'dawn' : nearSet ? 'dusk' : sunUp ? 'day' : 'night';
  const solar = Math.max(0, Math.min(1, sinceRise / (sinceRise + untilSet)));
  return {
    localTime: local.clock,
    phase,
    sunUp,
    solar,
    cloud: fresh ? sample.cloud : 0.2,
    raining: fresh && sample.raining,
    rain: fresh ? sample.rain : 0,
    fresh,
  };
}

export async function fetchCityWeather(city, signal) {
  const params = new URLSearchParams({
    latitude: String(city.latitude), longitude: String(city.longitude),
    current: 'weather_code,rain,showers,cloud_cover', daily: 'sunrise,sunset',
    timezone: city.timezone, forecast_days: '1', timeformat: 'unixtime',
  });
  const res = await fetch(WEATHER_API + '?' + params, { signal, referrerPolicy: 'no-referrer', credentials: 'omit' });
  if (!res.ok) throw new Error('Weather service returned ' + res.status);
  const sample = readWeather(await res.json());
  if (!sample) throw new Error('Weather response was missing current conditions');
  return sample;
}
