"""
STEP 1B — Pull real events from Firebase Realtime Database into a CSV.

Requires:
  pip install firebase-admin pandas
  serviceAccountKey.json in this same folder (Firebase Console -> Project
  Settings -> Service Accounts -> Generate new private key)
"""

import firebase_admin
from firebase_admin import credentials, db
import pandas as pd

DATABASE_URL = "https://road-safety-hackathon-16b7d-default-rtdb.firebaseio.com/"


def pull_events():
    cred = credentials.Certificate("serviceAccountKey.json")
    firebase_admin.initialize_app(cred, {"databaseURL": DATABASE_URL})

    ref = db.reference("events")
    data = ref.get()

    if not data:
        raise SystemExit(
            "No data found under 'events'. Check: (1) phones actually wrote "
            "events, (2) the 'events' path is correct, (3) database rules."
        )

    rows = []
    for push_key, event in data.items():
        if isinstance(event, dict):
            event = dict(event)
            event["firebase_key"] = push_key
            rows.append(event)

    df = pd.DataFrame(rows)
    print(f"Pulled {len(df)} events from Firebase")
    print(df.columns.tolist())
    print(df.head())

    df.to_csv("real_driving_sensor_dataset.csv", index=False)
    print("Saved -> real_driving_sensor_dataset.csv")
    return df


if __name__ == "__main__":
    pull_events()
