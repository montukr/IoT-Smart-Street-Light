import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Power, Lightbulb } from "lucide-react";
import "./StreetlightDashboard.css";

const RPI_IP = "10.57.66.247"; // Replace with your Raspberry Pi IP
const API_BASE = `http://${RPI_IP}:5000/api/lights`;

function StreetlightDashboard() {
  const [lights, setLights] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/status`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setLights(data);
      setError(null);
    } catch (err) {
      setError("⚠️ Failed to fetch status");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 1000);
    return () => clearInterval(interval);
  }, []);

  const controlLight = async (lightName, action) => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/${lightName}/${action}`, {
        method: "POST",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await res.json();
      fetchStatus();
    } catch (err) {
      setError("⚠️ Failed to send control command");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-container">
      <motion.h1
        className="dashboard-title"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        Streetlight Monitoring Dashboard
      </motion.h1>

      {error && <div className="error-box">{error}</div>}

      <div className={`grid-container ${loading ? "updating" : ""}`}>
        {Object.entries(lights).map(([name, state], index) => (
          <motion.div
            key={name}
            className={`light-card ${loading ? "light-card-loading" : ""}`}
            whileHover={{ scale: 1.03 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <div className="card-header">
              <h2>{name}</h2>
              <Lightbulb
                className={`icon ${
                  state.pwm_started ? "icon-on" : "icon-off"
                }`}
                size={26}
              />
            </div>

            <div className="card-info">
              <p>Dark: {state.dark ? "Yes" : "No"}</p>
              <p>Fault: {state.fault ? "Yes" : "No"}</p>
              <p>Motion: {state.motion ? "Yes" : "No"}</p>
              <p>Proximity: {state.proximity ? "Yes" : "No"}</p>
              <p>
                Status:{" "}
                <span
                  className={state.pwm_started ? "status-on" : "status-off"}
                >
                  {state.pwm_started ? "ON" : "OFF"}
                </span>
              </p>
            </div>

            <div className="button-row">
              <button
                onClick={() => controlLight(name, "on")}
                className="btn btn-on"
              >
                <Power size={16} /> Turn ON
              </button>
              <button
                onClick={() => controlLight(name, "off")}
                className="btn btn-off"
              >
                <Power size={16} /> Turn OFF
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export default StreetlightDashboard;
