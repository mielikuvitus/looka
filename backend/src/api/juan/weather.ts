// juan — weather tool. Owner: juan (gentle default; edit freely).
//
// Free, keyless current-weather lookup for Berlin via Open-Meteo. No API key
// needed, so this is safe to call as often as you like while testing.

const BERLIN = { latitude: 52.52, longitude: 13.405 }

export interface BerlinWeather {
  temperatureC: number
  windSpeedKmh: number
  isDay: boolean
  ok: boolean
}

export async function getBerlinWeather(): Promise<BerlinWeather> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${BERLIN.latitude}&longitude=${BERLIN.longitude}&current_weather=true`

  try {
    const res = await fetch(url)
    if (!res.ok)
      throw new Error(`Open-Meteo responded ${res.status}`)

    const data = await res.json() as { current_weather: { temperature: number, windspeed: number, is_day: number } }
    const { temperature, windspeed, is_day } = data.current_weather

    return { temperatureC: temperature, windSpeedKmh: windspeed, isDay: is_day === 1, ok: true }
  }
  catch (err) {
    console.error('[juan/weather] request failed:', err)
    return { temperatureC: 0, windSpeedKmh: 0, isDay: true, ok: false }
  }
}
