import assert from 'node:assert/strict';
import test from 'node:test';
import { CITY_LIST, cityWeather, pickCity, readWeather } from '../weather.js';

const utc = (text) => Date.parse(text + 'Z');
const now = utc('2026-11-28T04:00:00');
const seconds = (text) => utc(text) / 1000;
const taipei = pickCity('taipei');

function sample({ code = 1, rain = 0, showers = 0, at = now } = {}) {
  return readWeather({
    current: { time: at / 1000, weather_code: code, rain, showers, cloud_cover: 79 },
    daily: { sunrise: [seconds('2026-11-27T22:15:00')], sunset: [seconds('2026-11-28T09:04:00')] },
  });
}

test('manual city selection changes both the time and the day/night state at one instant', () => {
  const taipeiDay = cityWeather(taipei, null, now);
  const newYorkNight = cityWeather(pickCity('new-york'), null, now);
  assert.equal(taipeiDay.localTime, '12:00');
  assert.equal(taipeiDay.phase, 'day');
  assert.equal(newYorkNight.localTime, '23:00');
  assert.equal(newYorkNight.phase, 'night');
  for (const city of CITY_LIST) assert.match(cityWeather(city, null, now).localTime, /^\d\d:\d\d$/);
  assert.equal(pickCity('unknown'), taipei);
});

test('city sunrise and sunset drive the sun and twilight instead of fixed hours', () => {
  const forecast = sample();
  const nearDusk = cityWeather(taipei, forecast, utc('2026-11-28T09:00:00'));
  const afterSunset = cityWeather(taipei, forecast, utc('2026-11-28T09:10:00'));
  assert.equal(nearDusk.phase, 'dusk');
  assert.equal(nearDusk.sunUp, true);
  assert.equal(afterSunset.phase, 'dusk');
  assert.equal(afterSunset.sunUp, false);
  assert.equal(afterSunset.solar, 1);
});

test('fresh rain codes and actual rainfall turn on the rain effect', () => {
  for (const setup of [{ code: 61 }, { rain: 0.2 }, { showers: 0.8 }, { code: 95 }]) {
    assert.equal(cityWeather(taipei, sample(setup), now).raining, true);
  }
  assert.equal(cityWeather(taipei, sample({ code: 71 }), now).raining, false);
});

test('stale or missing weather never leaves old rainfall active', () => {
  const stale = cityWeather(taipei, sample({ code: 61, at: now - 46 * 60 * 1000 }), now);
  assert.equal(stale.fresh, false);
  assert.equal(stale.raining, false);
  assert.equal(stale.phase, 'day');
  assert.equal(readWeather({ current: { time: 0 } }), null);
});
