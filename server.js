require('dotenv').config();
const express = require('express');
const axios = require('axios');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const WEATHER_API_KEY = process.env.WEATHER_API_KEY;
const WEATHER_API_BASE = 'https://api.openweathermap.org/data/2.5/weather';
const REQUEST_TIMEOUT_MS = 5000;
const MAX_RETRIES = 2;

if (!WEATHER_API_KEY) {
  console.error('Missing WEATHER_API_KEY in environment. Create a .env file with WEATHER_API_KEY.');
  process.exit(1);
}

function buildWeatherUrl(city) {
  const params = new URLSearchParams({
    q: city,
    appid: WEATHER_API_KEY,
    units: 'metric'
  });
  return `${WEATHER_API_BASE}?${params.toString()}`;
}

function transformWeatherResponse(raw) {
  return {
    city: raw.name || null,
    temperature_celsius: raw.main?.temp ?? null,
    humidity_percent: raw.main?.humidity ?? null,
    condition: raw.weather?.[0]?.description ?? 'unknown',
    provider: 'openweathermap'
  };
}

function createBackoffDelay(attempt) {
  const base = Math.pow(2, attempt) * 500;
  return base + Math.floor(Math.random() * 300);
}

function isRetryableError(error) {
  if (error.code === 'ECONNABORTED') return true; // timeout
  if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') return true;
  if (error.response && error.response.status >= 500) return true;
  return false;
}

async function fetchFromApi(city) {
  const url = buildWeatherUrl(city);

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const response = await axios.get(url, {
        timeout: REQUEST_TIMEOUT_MS,
        validateStatus: status => status >= 200 && status < 300
      });
      return response.data;
    } catch (error) {
      const retry = attempt < MAX_RETRIES && isRetryableError(error);

      if (!retry) {
        throw error;
      }

      const delay = createBackoffDelay(attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw new Error('Weather API request failed after retries.');
}

function fallbackResponse(city) {
  return {
    city,
    temperature_celsius: null,
    humidity_percent: null,
    condition: 'Service unavailable. Please try again later.',
    provider: 'fallback'
  };
}

app.get('/api/weather', async (req, res) => {
  const city = String(req.query.city || '').trim();

  if (!city) {
    return res.status(400).json({
      error: 'Missing required query parameter: city'
    });
  }

  try {
    const rawData = await fetchFromApi(city);
    const payload = transformWeatherResponse(rawData);
    return res.json(payload);
  } catch (error) {
    if (error.response) {
      const status = error.response.status;
      console.error('Weather API responded with', status, error.message);

      if (status === 401) {
        return res.status(401).json({
          error: 'Unauthorized: Invalid or missing API key. Verify WEATHER_API_KEY in .env.'
        });
      }

      if (status === 404) {
        return res.status(404).json({
          error: 'City not found. Verify the city name and formatting in the city query parameter.'
        });
      }

      if (status === 429) {
        return res.status(429).json({
          error: 'Rate limit exceeded. Please wait and retry later.'
        });
      }

      if (status >= 400 && status < 500) {
        return res.status(status).json({
          error: 'Invalid request. Check the city name and your API key.'
        });
      }

      return res.status(503).json(fallbackResponse(city));
    }

    if (error.code === 'ECONNABORTED') {
      console.error('Weather API request timed out.');
      return res.status(504).json(fallbackResponse(city));
    }

    console.error('Unexpected error while fetching weather:', error.message || error);
    return res.status(502).json(fallbackResponse(city));
  }
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime_seconds: Number(process.uptime().toFixed(0)),
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

app.get('/', (req, res) => {
  res.json({
    service: 'DecodeLabs Project 4 Backend',
    version: process.env.npm_package_version || '1.0.0',
    endpoints: [
      '/api/weather?city={city}',
      '/api/health'
    ]
  });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`DecodeLabs Project 4 backend listening on http://localhost:${PORT}`);
});
