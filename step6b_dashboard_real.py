"""
STEP 6B — Build the Folium map dashboard from real clustered danger zones.
"""

import pandas as pd
import folium

INPUT_CSV = "step4b_real_danger_zones.csv"
OUTPUT_HTML = "dashboard_real.html"

# Paste the SAME firebaseConfig object that's already inside your index.html
# here (apiKey, authDomain, databaseURL, projectId, etc). This is the public
# web config, NOT the serviceAccountKey.json admin file -- safe to reuse.
FIREBASE_WEB_CONFIG = {
    "apiKey": "PASTE_YOUR_API_KEY_HERE",
    "authDomain": "road-safety-hackathon-16b7d.firebaseapp.com",
    "databaseURL": "https://road-safety-hackathon-16b7d-default-rtdb.firebaseio.com/",
    "projectId": "road-safety-hackathon-16b7d",
    "storageBucket": "road-safety-hackathon-16b7d.appspot.com",
    "messagingSenderId": "PASTE_YOUR_SENDER_ID_HERE",
    "appId": "PASTE_YOUR_APP_ID_HERE",
}


def risk_color(n_events: int) -> str:
    if n_events >= 5:
        return "red"
    if n_events >= 3:
        return "orange"
    return "green"


def reset_button_html() -> str:
    config_js = str(FIREBASE_WEB_CONFIG).replace("'", '"')
    return f"""
    <script src="https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js"></script>
    <script src="https://www.gstatic.com/firebasejs/8.10.1/firebase-database.js"></script>
    <script>
      var firebaseConfig = {config_js};
      firebase.initializeApp(firebaseConfig);

      function resetZones() {{
        if (!confirm("This deletes ALL events from Firebase. Continue?")) return;
        firebase.database().ref("events").remove()
          .then(() => alert("Zones reset. Re-run the pipeline / watcher to see the map clear."))
          .catch((err) => alert("Reset failed: " + err.message));
      }}
    </script>
    <button onclick="resetZones()"
      style="position:fixed; top:10px; right:10px; z-index:9999;
             padding:10px 16px; background:#d9534f; color:white;
             border:none; border-radius:6px; font-size:14px; cursor:pointer;">
      Reset Zones
    </button>
    """


def build_dashboard():
    df = pd.read_csv(INPUT_CSV)

    # FALLBACK: if no clusters exist yet (not enough phones/data), fall back
    # to plotting every flagged danger event individually so you always get
    # a visible map. Once you have multiple phones confirming the same spot,
    # step4b will produce real clusters and this fallback won't be needed.
    if df.empty:
        df = pd.read_csv("step2b_real_labeled_events.csv")
        df = df[df["is_real_danger"] == True].copy()
        if df.empty:
            raise SystemExit("No danger events at all yet -- run the pipeline after collecting some phone shakes.")
        df["cluster_id"] = range(len(df))  # each event gets its own "zone" for now
        print("No multi-phone clusters yet -- plotting individual flagged events instead.")

    center_lat = df["lat"].mean()
    center_lon = df["lon"].mean()

    # Center on the MOST RECENT event's location (not the average of all
    # zones), so the map always shows where your phones currently are,
    # even right after the very first refresh.
    try:
        all_events = pd.read_csv("real_driving_sensor_dataset.csv")
        if "timestamp" in all_events.columns and not all_events.empty:
            latest = all_events.sort_values("timestamp").iloc[-1]
            center_lat = latest["lat"]
            center_lon = latest["lon"]
    except FileNotFoundError:
        pass

    m = folium.Map(location=[center_lat, center_lon], zoom_start=17)

    for cluster_id, group in df.groupby("cluster_id"):
        avg_lat = group["lat"].mean()
        avg_lon = group["lon"].mean()
        n_events = len(group)
        cars = group["car_id"].astype(str).str.strip().nunique()

        popup_html = (
            f"<b>Danger Zone {cluster_id}</b><br>"
            f"Events: {n_events}<br>"
            f"Vehicles involved: {cars}<br>"
            f"Avg brake force: {group['brake_force'].mean():.2f}"
        )

        folium.Circle(
            location=[avg_lat, avg_lon],
            radius=25,
            color=risk_color(n_events),
            fill=True,
            fill_opacity=0.5,
            popup=folium.Popup(popup_html, max_width=250),
        ).add_to(m)

    m.save(OUTPUT_HTML)

    # Add auto-refresh so an already-open browser tab reloads itself
    # periodically, picking up new data without you re-running anything
    # manually in that tab. Also inject the Reset Zones button.
    with open(OUTPUT_HTML, "r") as f:
        html = f.read()
    html = html.replace(
        "<head>",
        '<head>\n    <meta http-equiv="refresh" content="20">',
        1,
    )
    html = html.replace("</body>", reset_button_html() + "\n</body>", 1)
    with open(OUTPUT_HTML, "w") as f:
        f.write(html)

    print(f"Saved -> {OUTPUT_HTML}")


if __name__ == "__main__":
    build_dashboard()