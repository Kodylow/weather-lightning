import { useState, useEffect } from 'react';
import { fetchWithL402 } from "alby-tools";
import './App.css'

export default function App() {
  const [city, setCity] = useState('Kigali');
  const [loading, setLoading] = useState(false);
  const [weather, setWeather] = useState({});

  const getWeather = async () => {
    setLoading(true);
    try {
      const url = `/lookup?city=${city}`;
      const response = await fetchWithL402(url);
      const data = await response.json();
      setWeather(data);
    }
    catch(e) {
      console.error(e);
      alert(`Sorry, something went wrong: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <img src="/src/client/assets/Alby-logo-figure-full.svg" height="100" />
      <h2>Weather Lightning</h2>
      <p>
        City: <input type="text" value={city} onChange={(e) => { setCity(e.target.value) }} />
      </p>
      <button type="button" onClick={getWeather} >Show Weather Details</button>
      <div>
        {weather.current && (
          <p>In {weather.location.name}, {weather.location.country} it is currently {weather.current.condition.text} at {weather.current.temp_c}°C</p>
        )}
        {loading && (<p>loading...</p>)}
      </div>
      <hr />
      <div className="about">
        <h3>About</h3>
        For 100 sats you can request the weather details of any city. <br />
        With this 100 sats the weather data API provider is paid <br />
        and a 10% split is automatically sent to all developers building the libraries making this app possible.
  
        <h3>How does it work?</h3>
        This application requests a payment of 100 satoshi from the user using <a href="https://webln.guide">WebLN</a>.<br />
        Once the payment is validated the app requests an <a href="https://lsat.tech/">LSAT</a> protected weather data API and pays for the data with lightning.<br />
        It also loads the funding details of all NPM packages and automatically sends a 10% split to each developer.
        <br />
        <br />
        
        <img src="/src/client/assets/flow.excalidraw.svg" className="flow" />
        <p>
          <strong>
            The app takes the money from the user, <br />
            automatically pays for the data request and <br />
            splits they money with the developers of the libraries used to build this app.
          </strong>
        </p>
        <h3>Code</h3>
        <ul>
          <li><a href="https://replit.com/@bumi17/weather-lightning">Replit for this frontend app</a></li>
          <li><a href="https://replit.com/@getalby/lsat-weather-api">Replit for the LSAT weather API</a></li>
        </ul>
      </div>
    </main>
  )
}
