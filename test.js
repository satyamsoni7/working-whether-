const fs = require('fs');
const apiCode = fs.readFileSync('js/api.js', 'utf8');
eval(apiCode.replace('const WeatherAPI', 'global.WeatherAPI ='));
const data = JSON.parse(fs.readFileSync('test.json', 'utf8'));

console.log("Current weather_code:", data.current.weather_code);
const wInfo = WeatherAPI.interpretWeatherCode(data.current.weather_code, 1);
console.log("SVG size:", wInfo.iconSvg.length);

const hourly = data.hourly;
const nowHour = 15;
for (let i = 0; i < 6; i++) {
  const idx = nowHour + i * 3;
  if (idx >= hourly.time.length) break;
  const timeStr = hourly.time[idx];
  const hDate = new Date(timeStr);
  const isDay = (hDate.getHours() >= 6 && hDate.getHours() <= 19) ? 1 : 0;
  const hInfo = WeatherAPI.interpretWeatherCode(hourly.weather_code[idx], isDay);
  console.log(`Hour ${timeStr}, code: ${hourly.weather_code[idx]}, SVG size: ${hInfo.iconSvg.length}`);
}

const daily = data.daily;
for (let i = 0; i < 7; i++) {
  if (i >= daily.time.length) break;
  const dateStr = daily.time[i];
  const dInfo = WeatherAPI.interpretWeatherCode(daily.weather_code[i], 1);
  console.log(`Day ${dateStr}, code: ${daily.weather_code[i]}, SVG size: ${dInfo.iconSvg.length}`);
}
