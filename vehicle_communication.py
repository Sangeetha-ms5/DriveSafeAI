import math
import firebase_admin
from firebase_admin import credentials, db
from datetime import datetime, timezone


# -------------------------------------------------
# CONFIGURATION
# -------------------------------------------------

RADIUS_METERS = 1000

if not firebase_admin._apps:
    cred = credentials.Certificate("serviceAccountKey.json")

    firebase_admin.initialize_app(
        cred,
        {
            "databaseURL":
                "https://road-safety-hackathon-16b7d-default-rtdb.firebaseio.com/"
        }
    )


# -------------------------------------------------
# HAVERSINE DISTANCE
# Calculates distance between two GPS coordinates
# -------------------------------------------------

def calculate_distance(lat1, lon1, lat2, lon2):

    R = 6371000  # Earth radius in meters

    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)

    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_phi / 2) ** 2
        +
        math.cos(phi1)
        * math.cos(phi2)
        * math.sin(delta_lambda / 2) ** 2
    )

    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return R * c


# -------------------------------------------------
# VEHICLE TO VEHICLE WARNING
# -------------------------------------------------

def send_v2v_alert(
    accident_lat,
    accident_lon,
    accident_car_id,
    accident_type="ACCIDENT"
):

    print("\n🚨 VEHICLE-TO-VEHICLE ALERT SYSTEM")
    print("-----------------------------------")

    print(
        f"Accident detected at: "
        f"{accident_lat}, {accident_lon}"
    )

    vehicles_ref = db.reference("vehicles")
    vehicles = vehicles_ref.get()

    if not vehicles:
        print("❌ No vehicles found in Firebase.")
        return

    alerts_ref = db.reference("vehicle_alerts")

    alerted_vehicles = []

    for vehicle_key, vehicle in vehicles.items():

        try:

            car_id = vehicle.get("car_id")

            # Don't send warning to accident vehicle
            if car_id == accident_car_id:
                continue

            vehicle_lat = float(vehicle["lat"])
            vehicle_lon = float(vehicle["lon"])

            distance = calculate_distance(
                accident_lat,
                accident_lon,
                vehicle_lat,
                vehicle_lon
            )

            print(
                f"Checking {car_id}: "
                f"{distance:.2f} meters away"
            )

            if distance <= RADIUS_METERS:

                alert = {
                    "car_id": car_id,

                    "warning":
                        "⚠️ ACCIDENT AHEAD! "
                        "Change route or lane immediately.",

                    "accident_lat": accident_lat,
                    "accident_lon": accident_lon,

                    "distance_meters":
                        round(distance, 2),

                    "alert_type": "V2V_ACCIDENT_WARNING",

                    "timestamp":
                        datetime.now(
                            timezone.utc
                        ).isoformat(),

                    "status": "UNREAD"
                }

                alerts_ref.push(alert)

                alerted_vehicles.append(car_id)

                print(
                    f"📡 ALERT SENT TO {car_id}"
                )

        except Exception as e:

            print(
                f"Error processing vehicle "
                f"{vehicle_key}: {e}"
            )

    print("\n=================================")
    print(
        f"Vehicles alerted: "
        f"{len(alerted_vehicles)}"
    )
    print("=================================\n")

    return alerted_vehicles


# -------------------------------------------------
# TEST
# -------------------------------------------------

if __name__ == "__main__":

    send_v2v_alert(
        accident_lat=12.964589,
        accident_lon=76.727821,
        accident_car_id="Car 19"
    )