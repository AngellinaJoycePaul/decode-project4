# Project 4 - Third-Party API Integration
**DecodeLabs Backend Development Internship**
Built by: Angellina Joyce Paul

## About

This backend project demonstrates secure API key handling, async fetch logic, response transformation, and resilience for a third-party weather API.

## Setup

1. Copy `.env.example` to `.env`.
2. Add your `WEATHER_API_KEY` from a provider like OpenWeatherMap.
3. Install dependencies:

```bash
npm install
```

4. Start the server:

```bash
npm start
```

For development with automatic reloads, use:

```bash
npm run dev
```

## API Usage

Request weather data through the backend proxy:

```bash
curl "http://localhost:3000/api/weather?city=London"
```

Check service health:

```bash
curl "http://localhost:3000/api/health"
```

Inspect root metadata and supported routes:

```bash
curl "http://localhost:3000/"
```

## Behavior

- Stores secrets only in `.env`
- Proxies requests to the weather API using `axios`
- Uses `async/await` and a strict timeout
- Transforms provider payload into a clean client schema
- Handles API errors, network timeouts, and provider failures gracefully
