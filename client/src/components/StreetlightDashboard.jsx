// import React, { useState, useEffect } from "react";
// import { motion } from "framer-motion";
// import { Power, Lightbulb } from "lucide-react";
// import "./StreetlightDashboard.css";

// const RPI_IP = "10.57.66.247"; // Replace with your Raspberry Pi IP
// const API_BASE = `http://${RPI_IP}:5000/api/lights`;

// function StreetlightDashboard() {
//   const [lights, setLights] = useState({});
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState(null);

//   const fetchStatus = async () => {
//     try {
//       setLoading(true);
//       const res = await fetch(`${API_BASE}/status`);
//       if (!res.ok) throw new Error(`HTTP ${res.status}`);
//       const data = await res.json();
//       setLights(data);
//       setError(null);
//     } catch (err) {
//       setError("⚠️ Failed to fetch status");
//       console.error(err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchStatus();
//     const interval = setInterval(fetchStatus, 1000);
//     return () => clearInterval(interval);
//   }, []);

//   const controlLight = async (lightName, action) => {
//     try {
//       setLoading(true);
//       const res = await fetch(`${API_BASE}/${lightName}/${action}`, {
//         method: "POST",
//       });
//       if (!res.ok) throw new Error(`HTTP ${res.status}`);
//       await res.json();
//       fetchStatus();
//     } catch (err) {
//       setError("⚠️ Failed to send control command");
//       console.error(err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="dashboard-container">
//       <motion.h1
//         className="dashboard-title"
//         initial={{ opacity: 0, y: -20 }}
//         animate={{ opacity: 1, y: 0 }}
//       >
//         Streetlight Monitoring Dashboard
//       </motion.h1>

//       {error && <div className="error-box">{error}</div>}

//       <div className={`grid-container ${loading ? "updating" : ""}`}>
//         {Object.entries(lights).map(([name, state], index) => (
//           <motion.div
//             key={name}
//             className={`light-card ${loading ? "light-card-loading" : ""}`}
//             whileHover={{ scale: 1.03 }}
//             initial={{ opacity: 0, y: 20 }}
//             animate={{ opacity: 1, y: 0 }}
//             transition={{ delay: index * 0.1 }}
//           >
//             <div className="card-header">
//               <h2>{name}</h2>
//               <Lightbulb
//                 className={`icon ${
//                   state.pwm_started ? "icon-on" : "icon-off"
//                 }`}
//                 size={26}
//               />
//             </div>

//             <div className="card-info">
//               <p>Dark: {state.dark ? "Yes" : "No"}</p>
//               <p>Fault: {state.fault ? "Yes" : "No"}</p>
//               <p>Motion: {state.motion ? "Yes" : "No"}</p>
//               <p>Proximity: {state.proximity ? "Yes" : "No"}</p>
//               <p>
//                 Status:{" "}
//                 <span
//                   className={state.pwm_started ? "status-on" : "status-off"}
//                 >
//                   {state.pwm_started ? "ON" : "OFF"}
//                 </span>
//               </p>
//             </div>

//             <div className="button-row">
//               <button
//                 onClick={() => controlLight(name, "on")}
//                 className="btn btn-on"
//               >
//                 <Power size={16} /> Turn ON
//               </button>
//               <button
//                 onClick={() => controlLight(name, "off")}
//                 className="btn btn-off"
//               >
//                 <Power size={16} /> Turn OFF
//               </button>
//             </div>
//           </motion.div>
//         ))}
//       </div>
//     </div>
//   );
// }

// export default StreetlightDashboard;


import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Power, Lightbulb } from "lucide-react";
import "./StreetlightDashboard.css";

const RPI_IP = import.meta.env.VITE_API_HOST || "10.57.66.247";
const API = `http://${RPI_IP}:5000/api`;

export default function StreetlightDashboard() {
  const [mode, setMode] = useState("manual");
  const [lights, setLights] = useState({});
  const [pending, setPending] = useState({});
  const [err, setErr] = useState("");

  // Fetch live status
  const fetchStatus = async () => {
    try {
      const res = await fetch(`${API}/lights/status`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      setMode(data.mode || "manual");
      setLights(data.lights || {});
      setErr("");
    } catch (e) {
      setErr("Failed to fetch status");
      console.error(e);
    }
  };

  useEffect(() => {
    fetchStatus();
    const t = setInterval(fetchStatus, 1000);
    return () => clearInterval(t);
  }, []);

  // Switch mode between auto/manual
  const switchMode = async (m) => {
    try {
      const res = await fetch(`${API}/mode`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: m }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const out = await res.json();
      setMode(out.mode);
      fetchStatus();
    } catch (e) {
      setErr("Failed to change mode");
      console.error(e);
    }
  };

  // Manual action (ON/DIM/OFF)
  const act = async (name, action) => {
    if (mode !== "manual") return;

    setPending((p) => ({ ...p, [name]: true }));

    try {
      const res = await fetch(`${API}/lights/${encodeURIComponent(name)}/${action}`, {
        method: "POST",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      await res.json();
      fetchStatus();
    } catch (e) {
      setErr(`Action failed: ${e.message}`);
      console.error(e);
    } finally {
      setPending((p) => ({ ...p, [name]: false }));
    }
  };

  return (
    <div className="dashboard-shell">
      <div className="dashboard-frame">

        {/* Topbar */}
        <motion.div
          className="topbar"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="brand">RoboLights</div>

          <div className="mode-bar">
            <button
              className={`mode-btn ${mode === "auto" ? "active" : ""}`}
              onClick={() => switchMode("auto")}
            >
              Automatic
            </button>

            <button
              className={`mode-btn ${mode === "manual" ? "active" : ""}`}
              onClick={() => switchMode("manual")}
            >
              Manual
            </button>
          </div>

          <div className="mode-chip">{mode.toUpperCase()}</div>
        </motion.div>

        {err && <div className="error-box">{err}</div>}

        {/* Responsive Grid */}
        <div className="cards-grid">
          {Object.entries(lights).map(([name, st], i) => (
            <motion.div
              key={name}
              className="card"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              {/* Card Header */}
              <div className="card-head">
                <div className="card-title">
                  <Lightbulb size={18} />
                  {name}
                </div>
                <div className={`status-dot ${st.pwm_started ? "on" : "off"}`} />
              </div>

              {/* Telemetry */}
              <div className="telemetry">
                <div>Dark: <b>{st.dark ? "Yes" : "No"}</b></div>
                <div>Fault: <b>{st.fault ? "Yes" : "No"}</b></div>
                <div>Motion: <b>{st.motion ? "Yes" : "No"}</b></div>
                <div>Proximity: <b>{st.proximity ? "Yes" : "No"}</b></div>
                {"duty" in st && <div>Duty: <b>{st.duty}%</b></div>}
              </div>

              {/* Manual Controls */}
              {mode === "manual" && (
                <div className="controls">
                  <button
                    className="btn on"
                    onClick={() => act(name, "on")}
                    disabled={pending[name]}
                  >
                    <Power size={14} /> On
                  </button>

                  <button
                    className="btn dim"
                    onClick={() => act(name, "dim")}
                    disabled={pending[name]}
                  >
                    Dim
                  </button>

                  <button
                    className="btn off"
                    onClick={() => act(name, "off")}
                    disabled={pending[name]}
                  >
                    Off
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
