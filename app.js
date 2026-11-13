
const form = document.getElementById("search-form");
const cityInput = document.getElementById("city-input");
const searchBtn = document.getElementById("search-btn");
const message = document.getElementById("message");
const weatherCard = document.getElementById("weather-card");
const unitBtn = document.getElementById("unit-btn");

let currentUnit = "C";
let weatherData = null;

const weatherDescriptions = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    71: "Slight snow",
    73: "Moderate snow",
    75: "Heavy snow",
    80: "Rain showers",
    81: "Moderate rain showers",
    82: "Heavy rain showers",
    85: "Snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm with hail",
    99: "Heavy thunderstorm with hail"
};

function showMessage(text, type = "") {
    message.textContent = text;
    message.className = type;
}

function getDescription(code) {
    return weatherDescriptions[code] ||
        "Weather conditions unavailable";
}

function getWeatherEmoji(code, isDay) {
    if (code === 0) return isDay ? "☀️" : "🌙";
    if (code === 1 || code === 2) return "🌤️";
    if ([3, 45, 48].includes(code)) return "☁️";
    if ([51, 53, 55, 56, 57, 61, 63, 65,
         66, 67, 80, 81, 82].includes(code)) return "🌧️";
    if ([71, 73, 75, 77, 85, 86].includes(code)) return "🌨️";
    if ([95, 96, 99].includes(code)) return "⛈️";
    return "🌡️";
}

async function getCoordinates(city) {
    const url = new URL(
        "https://geocoding-api.open-meteo.com/v1/search"
    );

    url.search = new URLSearchParams({
        name: city,
        count: "1",
        language: "en",
        format: "json"
    });

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error("City search service is unavailable.");
    }

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
        throw new Error(
            "City not found. Please check the spelling."
        );
    }

    return data.results[0];
}

async function getWeather(latitude, longitude) {
    const url = new URL(
        "https://api.open-meteo.com/v1/forecast"
    );

    url.search = new URLSearchParams({
        latitude: latitude,
        longitude: longitude,
        current: [
            "temperature_2m",
            "relative_humidity_2m",
            "apparent_temperature",
            "is_day",
            "weather_code",
            "wind_speed_10m",
            "surface_pressure"
        ].join(","),
        timezone: "auto"
    });

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error("Unable to retrieve weather data.");
    }

    const data = await response.json();

    if (!data.current) {
        throw new Error("Weather information is unavailable.");
    }

    return data;
}

function convertTemperature(celsius) {
    if (currentUnit === "F") {
        return (celsius * 9 / 5) + 32;
    }

    return celsius;
}

function displayTemperature(celsius) {
    const value = Math.round(convertTemperature(celsius));
    return `${value}°${currentUnit}`;
}

function displayWeather(place, data) {
    const current = data.current;
    weatherData = { place, data };

    document.getElementById("city-name").textContent =
        place.name;

    document.getElementById("country").textContent =
        [place.admin1, place.country]
            .filter(Boolean)
            .join(", ");

    document.getElementById("temperature").textContent =
        displayTemperature(current.temperature_2m);

    document.getElementById("feels-like").textContent =
        displayTemperature(current.apparent_temperature);

    document.getElementById("humidity").textContent =
        current.relative_humidity_2m != null
            ? `${current.relative_humidity_2m}%`
            : "N/A";

    document.getElementById("wind-speed").textContent =
        current.wind_speed_10m != null
            ? `${current.wind_speed_10m} km/h`
            : "N/A";

    document.getElementById("pressure").textContent =
        current.surface_pressure != null
            ? `${Math.round(current.surface_pressure)} hPa`
            : "N/A";

    document.getElementById("description").textContent =
        getDescription(current.weather_code);

    const icon = document.getElementById("weather-icon");
    const emoji = getWeatherEmoji(
        current.weather_code,
        current.is_day === 1
    );

    icon.src = "data:image/svg+xml;charset=utf-8," +
        encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" ` +
            `width="100" height="100" viewBox="0 0 100 100">` +
            `<text x="50" y="75" font-size="68" ` +
            `text-anchor="middle">${emoji}</text></svg>`
        );

    icon.alt = getDescription(current.weather_code);

    unitBtn.textContent = currentUnit === "C"
        ? "Switch to Fahrenheit (°F)"
        : "Switch to Celsius (°C)";

    weatherCard.hidden = false;
}

async function searchCity(city) {
    const cleanCity = city.trim();

    if (!cleanCity) {
        showMessage("Please enter a city name.", "error");
        cityInput.focus();
        return;
    }

    searchBtn.disabled = true;
    cityInput.disabled = true;
    showMessage("Loading weather information...");

    try {
        const place = await getCoordinates(cleanCity);

        const data = await getWeather(
            place.latitude,
            place.longitude
        );

        displayWeather(place, data);
        showMessage(
            `Weather updated for ${place.name}.`,
            "success"
        );

    } catch (error) {
        showMessage(
            error.message ||
            "Something went wrong. Please try again.",
            "error"
        );

    } finally {
        searchBtn.disabled = false;
        cityInput.disabled = false;
    }
}

form.addEventListener("submit", function(event) {
    event.preventDefault();
    searchCity(cityInput.value);
});

unitBtn.addEventListener("click", function() {
    if (!weatherData) return;

    currentUnit = currentUnit === "C" ? "F" : "C";

    displayWeather(
        weatherData.place,
        weatherData.data
    );
});

