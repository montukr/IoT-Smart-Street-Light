// // import React, { useState, useEffect } from "react";
// // import { motion } from "framer-motion";
// // import { Power, Lightbulb } from "lucide-react";
// // import "./StreetlightDashboard.css";

// // const RPI_IP = "10.57.66.247"; // Replace with your Raspberry Pi IP
// // const API_BASE = `http://${RPI_IP}:5000/api/lights`;

// // function StreetlightDashboard() {
// //   const [lights, setLights] = useState({});
// //   const [loading, setLoading] = useState(false);
// //   const [error, setError] = useState(null);

// //   const fetchStatus = async () => {
// //     try {
// //       setLoading(true);
// //       const res = await fetch(`${API_BASE}/status`);
// //       if (!res.ok) throw new Error(`HTTP ${res.status}`);
// //       const data = await res.json();
// //       setLights(data);
// //       setError(null);
// //     } catch (err) {
// //       setError("⚠️ Failed to fetch status");
// //       console.error(err);
// //     } finally {
// //       setLoading(false);
// //     }
// //   };

// //   useEffect(() => {
// //     fetchStatus();
// //     const interval = setInterval(fetchStatus, 1000);
// //     return () => clearInterval(interval);
// //   }, []);

// //   const controlLight = async (lightName, action) => {
// //     try {
// //       setLoading(true);
// //       const res = await fetch(`${API_BASE}/${lightName}/${action}`, {
// //         method: "POST",
// //       });
// //       if (!res.ok) throw new Error(`HTTP ${res.status}`);
// //       await res.json();
// //       fetchStatus();
// //     } catch (err) {
// //       setError("⚠️ Failed to send control command");
// //       console.error(err);
// //     } finally {
// //       setLoading(false);
// //     }
// //   };

// //   return (
// //     <div className="dashboard-container">
// //       <motion.h1
// //         className="dashboard-title"
// //         initial={{ opacity: 0, y: -20 }}
// //         animate={{ opacity: 1, y: 0 }}
// //       >
// //         Streetlight Monitoring Dashboard
// //       </motion.h1>

// //       {error && <div className="error-box">{error}</div>}

// //       <div className={`grid-container ${loading ? "updating" : ""}`}>
// //         {Object.entries(lights).map(([name, state], index) => (
// //           <motion.div
// //             key={name}
// //             className={`light-card ${loading ? "light-card-loading" : ""}`}
// //             whileHover={{ scale: 1.03 }}
// //             initial={{ opacity: 0, y: 20 }}
// //             animate={{ opacity: 1, y: 0 }}
// //             transition={{ delay: index * 0.1 }}
// //           >
// //             <div className="card-header">
// //               <h2>{name}</h2>
// //               <Lightbulb
// //                 className={`icon ${
// //                   state.pwm_started ? "icon-on" : "icon-off"
// //                 }`}
// //                 size={26}
// //               />
// //             </div>

// //             <div className="card-info">
// //               <p>Dark: {state.dark ? "Yes" : "No"}</p>
// //               <p>Fault: {state.fault ? "Yes" : "No"}</p>
// //               <p>Motion: {state.motion ? "Yes" : "No"}</p>
// //               <p>Proximity: {state.proximity ? "Yes" : "No"}</p>
// //               <p>
// //                 Status:{" "}
// //                 <span
// //                   className={state.pwm_started ? "status-on" : "status-off"}
// //                 >
// //                   {state.pwm_started ? "ON" : "OFF"}
// //                 </span>
// //               </p>
// //             </div>

// //             <div className="button-row">
// //               <button
// //                 onClick={() => controlLight(name, "on")}
// //                 className="btn btn-on"
// //               >
// //                 <Power size={16} /> Turn ON
// //               </button>
// //               <button
// //                 onClick={() => controlLight(name, "off")}
// //                 className="btn btn-off"
// //               >
// //                 <Power size={16} /> Turn OFF
// //               </button>
// //             </div>
// //           </motion.div>
// //         ))}
// //       </div>
// //     </div>
// //   );
// // }

// // export default StreetlightDashboard;


// import React, { useEffect, useState } from "react";
// import { motion } from "framer-motion";
// import { Power, Lightbulb } from "lucide-react";
// import "./StreetlightDashboard.css";

// const RPI_IP = import.meta.env.VITE_API_HOST || "10.212.160.247";
// const API = `http://${RPI_IP}:5000/api`;

// export default function StreetlightDashboard() {
//   const [mode, setMode] = useState("manual");
//   const [lights, setLights] = useState({});
//   const [pending, setPending] = useState({});
//   const [err, setErr] = useState("");

//   // Fetch live status
//   const fetchStatus = async () => {
//     try {
//       const res = await fetch(`${API}/lights/status`);
//       if (!res.ok) throw new Error(`HTTP ${res.status}`);

//       const data = await res.json();
//       setMode(data.mode || "manual");
//       setLights(data.lights || {});
//       setErr("");
//     } catch (e) {
//       setErr("Failed to fetch status");
//       console.error(e);
//     }
//   };

//   useEffect(() => {
//     fetchStatus();
//     const t = setInterval(fetchStatus, 1000);
//     return () => clearInterval(t);
//   }, []);

//   // Switch mode between auto/manual
//   const switchMode = async (m) => {
//     try {
//       const res = await fetch(`${API}/mode`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ mode: m }),
//       });
//       if (!res.ok) throw new Error(`HTTP ${res.status}`);

//       const out = await res.json();
//       setMode(out.mode);
//       fetchStatus();
//     } catch (e) {
//       setErr("Failed to change mode");
//       console.error(e);
//     }
//   };

//   // Manual action (ON/DIM/OFF)
//   const act = async (name, action) => {
//     if (mode !== "manual") return;

//     setPending((p) => ({ ...p, [name]: true }));

//     try {
//       const res = await fetch(`${API}/lights/${encodeURIComponent(name)}/${action}`, {
//         method: "POST",
//       });
//       if (!res.ok) throw new Error(`HTTP ${res.status}`);

//       await res.json();
//       fetchStatus();
//     } catch (e) {
//       setErr(`Action failed: ${e.message}`);
//       console.error(e);
//     } finally {
//       setPending((p) => ({ ...p, [name]: false }));
//     }
//   };

//   return (
//     <div className="dashboard-shell">
//       <div className="dashboard-frame">

//         {/* Topbar */}
//         <motion.div
//           className="topbar"
//           initial={{ opacity: 0, y: -12 }}
//           animate={{ opacity: 1, y: 0 }}
//         >
//           <div className="brand">RoboLights</div>

//           <div className="mode-bar">
//             <button
//               className={`mode-btn ${mode === "auto" ? "active" : ""}`}
//               onClick={() => switchMode("auto")}
//             >
//               Automatic
//             </button>

//             <button
//               className={`mode-btn ${mode === "manual" ? "active" : ""}`}
//               onClick={() => switchMode("manual")}
//             >
//               Manual
//             </button>
//           </div>

//           <div className="mode-chip">{mode.toUpperCase()}</div>
//         </motion.div>

//         {err && <div className="error-box">{err}</div>}

//         {/* Responsive Grid */}
//         <div className="cards-grid">
//           {Object.entries(lights).map(([name, st], i) => (
//             <motion.div
//               key={name}
//               className="card"
//               initial={{ opacity: 0, y: 18 }}
//               animate={{ opacity: 1, y: 0 }}
//               transition={{ delay: i * 0.05 }}
//             >
//               {/* Card Header */}
//               <div className="card-head">
//                 <div className="card-title">
//                   <Lightbulb size={18} />
//                   {name}
//                 </div>
//                 <div className={`status-dot ${st.pwm_started ? "on" : "off"}`} />
//               </div>

//               {/* Telemetry */}
//               <div className="telemetry">
//                 <div>Dark: <b>{st.dark ? "Yes" : "No"}</b></div>
//                 <div>Fault: <b>{st.fault ? "Yes" : "No"}</b></div>
//                 <div>Motion: <b>{st.motion ? "Yes" : "No"}</b></div>
//                 <div>Proximity: <b>{st.proximity ? "Yes" : "No"}</b></div>
//                 {"duty" in st && <div>Duty: <b>{st.duty}%</b></div>}
//               </div>

//               {/* Manual Controls */}
//               {mode === "manual" && (
//                 <div className="controls">
//                   <button
//                     className="btn on"
//                     onClick={() => act(name, "on")}
//                     disabled={pending[name]}
//                   >
//                     <Power size={14} /> On
//                   </button>

//                   <button
//                     className="btn dim"
//                     onClick={() => act(name, "dim")}
//                     disabled={pending[name]}
//                   >
//                     Dim
//                   </button>

//                   <button
//                     className="btn off"
//                     onClick={() => act(name, "off")}
//                     disabled={pending[name]}
//                   >
//                     Off
//                   </button>
//                 </div>
//               )}
//             </motion.div>
//           ))}
//         </div>
//       </div>
//     </div>
//   );
// }



import React, { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { Power, Lightbulb } from "lucide-react";
import "./StreetlightDashboard.css";

const RPI_IP = import.meta.env.VITE_API_HOST || "10.212.160.247";
const API = `http://${RPI_IP}:5000/api`;

// SVG line graph for simulated total energy
function EnergyGraph({ points, backendOk }) {
  const width = 600;
  const height = 140;
  const padding = 20;

  if (!points.length) {
    return (
      <div className="energy-panel">
        <div className="energy-header">
          <span>Energy utilisation (live)</span>
          <span className={`backend-dot ${backendOk ? "ok" : "bad"}`} />
        </div>
        <div className="energy-empty">Waiting for data…</div>
      </div>
    );
  }

  const maxVal = Math.max(...points.map((p) => p.value)) || 1;
  const minX = points[0].t;
  const maxX = points[points.length - 1].t || minX + 1;
  const spanX = maxX - minX || 1;

  const scaleX = (t) =>
    padding + ((t - minX) / spanX) * (width - 2 * padding);
  const scaleY = (v) =>
    height - padding - (v / maxVal) * (height - 2 * padding);

  const pathD = points
    .map((p, idx) => {
      const x = scaleX(p.t);
      const y = scaleY(p.value);
      return `${idx === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  const last = points[points.length - 1];
  const lastDisplay = last ? last.value.toFixed(2) : "0.00";

  return (
    <div className="energy-panel">
      <div className="energy-header">
        <span>Energy utilisation (live)</span>
        <div className="energy-meta">
          <span>Total: {lastDisplay} W</span>
          <span className={`backend-dot ${backendOk ? "ok" : "bad"}`} />
        </div>
      </div>
      <svg className="energy-graph" width={width} height={height}>
        <defs>
          <linearGradient id="energyLine" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#22c55e" />
          </linearGradient>
        </defs>
        <rect
          x="0"
          y="0"
          width={width}
          height={height}
          rx="10"
          fill="rgba(15,23,42,0.8)"
        />
        <path
          d={pathD}
          fill="none"
          stroke="url(#energyLine)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <div className="energy-legend">
        <span>LED1 ≈ 50% of total</span>
        <span>LED2 ≈ 50% of total</span>
      </div>
      {!backendOk && (
        <div className="energy-paused">Backend offline – graph paused</div>
      )}
    </div>
  );
}

export default function StreetlightDashboard() {
  const [mode, setMode] = useState("manual");
  const [lights, setLights] = useState({});
  const [pending, setPending] = useState({});
  const [err, setErr] = useState("");
  const [backendOk, setBackendOk] = useState(true);
  const [energyPoints, setEnergyPoints] = useState([]);
  const [showEnergy, setShowEnergy] = useState(false);
  const lastOkRef = useRef(Date.now());

  // Compute base energy from duty (0..2 kW)
  const computeBaseEnergy = (lightsObj) => {
    const names = Object.keys(lightsObj);
    if (!names.length) return 0;
    let totalDuty = 0;
    names.forEach((n) => {
      const st = lightsObj[n] || {};
      const duty =
        typeof st.duty === "number" ? st.duty : st.pwm_started ? 100 : 0;
      totalDuty += duty;
    });
    const maxDuty = names.length * 100 || 1;
    const utilisation = totalDuty / maxDuty;
    const baseKw = 2.0;
    return utilisation * baseKw;
  };

  // Add stock‑like jitter around base energy
  const addAnalogJitter = (base, prev) => {
    if (base <= 0) return 0;
    const last = prev ?? base;
    const maxStep = base * 0.03; // 3% step
    const delta = (Math.random() * 2 - 1) * maxStep;
    let next = last + delta;
    const min = base * 0.8;
    const max = base * 1.2;
    if (next < min) next = min;
    if (next > max) next = max;
    return next;
  };

  const fetchStatus = async () => {
    try {
      const res = await fetch(`${API}/lights/status`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setMode(data.mode || "manual");
      setLights(data.lights || {});
      setErr("");
      setBackendOk(true);
      lastOkRef.current = Date.now();

      const base = computeBaseEnergy(data.lights || {});
      const now = Date.now() / 1000;
      setEnergyPoints((prev) => {
        const prevVal = prev.length ? prev[prev.length - 1].value : base || 0;
        const val = addAnalogJitter(base, prevVal);
        const next = [...prev, { t: now, value: val }];
        return next.slice(-120); // roughly last 2 minutes at 1s steps
      });
    } catch (e) {
      console.error(e);
      setErr("Failed to fetch status");
      if (Date.now() - lastOkRef.current > 3000) {
        setBackendOk(false);
      }
    }
  };

  useEffect(() => {
    fetchStatus(); // runs after refresh
    const t = setInterval(fetchStatus, 1000);
    return () => clearInterval(t);
  }, []);

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

  const act = async (name, action) => {
    if (mode !== "manual") return;
    setPending((p) => ({ ...p, [name]: true }));
    try {
      const res = await fetch(
        `${API}/lights/${encodeURIComponent(name)}/${action}`,
        { method: "POST" }
      );
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
          <div className="brand">Street Lights</div>

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

        {/* Light cards */}
        <div className="cards-grid">
          {Object.entries(lights).map(([name, st], i) => (
            <motion.div
              key={name}
              className="card"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <div className="card-head">
                <div className="card-title">
                  <Lightbulb size={18} />
                  {name}
                </div>
                <div className={`status-dot ${st.pwm_started ? "on" : "off"}`} />
              </div>

              <div className="telemetry">
                <div>
                  Dark: <b>{st.dark ? "Yes" : "No"}</b>
                </div>
                <div>
                  Fault: <b>{st.fault ? "Yes" : "No"}</b>
                </div>
                <div>
                  Motion: <b>{st.motion ? "Yes" : "No"}</b>
                </div>
                <div>
                  Proximity: <b>{st.proximity ? "Yes" : "No"}</b>
                </div>
                {"duty" in st && (
                  <div>
                    Duty: <b>{st.duty}%</b>
                  </div>
                )}
              </div>

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

        {/* Toggle + energy graph below cards */}
        <div className="energy-toggle-row">
          <button
            className="energy-toggle-btn"
            onClick={() => setShowEnergy((v) => !v)}
          >
            {showEnergy ? "Hide energy graph" : "Show energy graph"}
          </button>
        </div>

        {showEnergy && (
          <div className="energy-wrapper">
            <EnergyGraph points={energyPoints} backendOk={backendOk} />
          </div>
        )}
      </div>
    </div>
  );
}
