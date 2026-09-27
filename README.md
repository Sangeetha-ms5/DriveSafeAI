# 🚗 DriveSafeAI – AI-Powered Road Safety Platform

DriveSafeAI is an AI-powered road safety platform designed to improve **accident prevention, real-time vehicle monitoring, and emergency response**. The system combines sensor data, AI-based analysis, Firebase, mobile simulation, and interactive dashboards to detect dangerous situations and provide timely assistance.

## 🚨 Key Features

### 1. 🛡️ Accident Prevention

* Real-time monitoring of vehicle and driving conditions.
* Detects abnormal or dangerous driving conditions.
* Provides driver assistance and safety alerts.
* Identifies high-risk/danger zones for improved road safety.

### 2. 📱 Mobile Sensor Simulation

* Provides a mobile-based simulation for testing vehicle sensor data.
* Simulates parameters such as **acceleration, impact magnitude, and vehicle status**.
* Accident magnitude can be evaluated using simulated sensor readings.
* Useful for testing the system without requiring physical sensors during development.

### 3. 💥 Accident Detection & Magnitude Analysis

* Detects potential accidents using sensor/telemetry data.
* Analyzes the **magnitude/severity of an impact**.
* Generates an accident event when predefined safety thresholds are exceeded.
* Sends the detected incident to the monitoring dashboard.

### 4. 📍 Real-Time Location Tracking

* Captures the vehicle's accident location.
* Displays the incident location on an interactive dashboard.
* Helps emergency responders identify the approximate accident location quickly.
* Vehicle information can be associated with the detected incident.

### 5. 🏥 Automatic Hospital Emergency Alert

After an accident is detected:

* The system identifies nearby hospitals based on the accident location.
* Generates an emergency notification for nearby hospitals.
* Shares relevant accident information such as **location, vehicle ID, and incident severity**.
* Helps reduce the time required to initiate emergency assistance.

### 6. 🚘 Automatic DIP/DIM Circuit

DriveSafeAI also includes an automatic vehicle lighting safety mechanism:

* Detects approaching/high-intensity vehicle headlights.
* Automatically switches between **DIP and DIM lighting modes** based on the detected condition.
* Helps reduce glare for approaching drivers.
* Improves night-time driving visibility and safety.

### 7. 📊 Interactive Safety Dashboard

The dashboard provides a centralized view of:

* Live vehicle status
* Accident alerts
* Accident magnitude/severity
* Vehicle ID
* Accident location
* Danger zones
* Emergency/hospital notifications
* Sensor and telemetry information

## 🔄 System Workflow

```text
        Vehicle / Mobile Simulation
                  │
                  ▼
        Sensor & Telemetry Data
                  │
                  ▼
        AI / Safety Analysis
                  │
        ┌─────────┴─────────┐
        │                   │
        ▼                   ▼
  Normal Condition     Dangerous Event
        │                   │
        ▼                   ▼
   Continue Driving    Accident Detection
                            │
                            ▼
                    Magnitude Analysis
                            │
                            ▼
                    Location Detection
                            │
             ┌──────────────┴──────────────┐
             ▼                             ▼
       Safety Dashboard              Nearby Hospitals
             │                             │
             ▼                             ▼
       Real-Time Alert              Emergency Alert
```

## 🧩 Main Modules

| Module                   | Description                                    |
| ------------------------ | ---------------------------------------------- |
| 🚗 Vehicle Monitoring    | Monitors vehicle and sensor parameters         |
| 📱 Mobile Simulation     | Simulates vehicle sensor/telemetry data        |
| 💥 Accident Detection    | Detects potential accidents                    |
| 📈 Magnitude Analysis    | Estimates impact severity                      |
| 📍 Location Tracking     | Displays accident location                     |
| 🏥 Emergency Response    | Connects accident events with nearby hospitals |
| 💡 DIP/DIM System        | Automatically manages vehicle lighting         |
| ⚠️ Danger-Zone Detection | Identifies high-risk road locations            |
| 📊 Dashboard             | Provides centralized real-time monitoring      |

## 🛠️ Technologies Used

* **Frontend:** HTML, CSS, JavaScript
* **Backend / Services:** Firebase
* **Database:** Firebase
* **AI / Data Processing:** AI-based analysis and sensor data processing
* **Simulation:** Mobile-based sensor simulation
* **Visualization:** Interactive web dashboard
* **Hardware Integration:** Vehicle sensors and DIP/DIM circuit

## 🎯 Objectives

* Prevent accidents through real-time monitoring and driver assistance.
* Detect accidents and estimate their magnitude automatically.
* Provide the accident location to emergency responders.
* Notify nearby hospitals after an accident.
* Improve night-time driving safety using automatic DIP/DIM control.
* Provide a centralized dashboard for monitoring road safety events.

## 🌟 Future Enhancements

* Vehicle-to-vehicle accident alerts.
* Automatic ambulance notification.
* Smart traffic-signal prioritization for emergency vehicles.
* AI-based driver drowsiness detection.
* Predictive accident-risk analysis.
* Risk-aware route recommendation.
* Integration with real GPS and IoT hardware.
* Cloud-based large-scale road safety analytics.

## 👩‍💻 Project

**Project Name:** DriveSafeAI
**Domain:** AI • Road Safety • IoT • Emergency Response
**Purpose:** Accident Prevention, Detection & Intelligent Emergency Management

# BYTE_FORCE1

Quick run instructions
----------------------

1) Create and activate a virtual environment (Windows PowerShell):

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

2) Install dependencies:

```powershell
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

3) Running options:

- Full pipeline (requires `serviceAccountKey.json` in the project root):

```powershell
& ".venv\Scripts\python.exe" run_pipeline_b.py
```

- Run from existing CSVs (no Firebase key needed):

```powershell
& ".venv\Scripts\python.exe" step2b_apply_threshold_rule.py
& ".venv\Scripts\python.exe" step4b_cluster_real_zones.py
& ".venv\Scripts\python.exe" step6b_dashboard_real.py
```

4) Open the generated `dashboard_real.html` in your browser. To serve locally:

```powershell
& ".venv\Scripts\python.exe" -m http.server 8000
# then open http://localhost:8000/dashboard_real.html
```

Notes:
- `serviceAccountKey.json` and `firebase-adminsdk-*.json` are intentionally ignored by git (see `.gitignore`). Download the service account JSON from Firebase Console -> Project Settings -> Service Accounts and place it in the project root if you want live Firebase fetches.
