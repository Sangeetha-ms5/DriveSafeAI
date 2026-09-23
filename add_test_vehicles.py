import firebase_admin
from firebase_admin import credentials, db

# Initialize Firebase
if not firebase_admin._apps:
    cred = credentials.Certificate("serviceAccountKey.json")

    firebase_admin.initialize_app(
        cred,
        {
            "databaseURL": "https://road-safety-hackathon-16b7d-default-rtdb.firebaseio.com/"
        }
    )

# Test vehicle data
vehicles = {
    "vehicle_1": {
        "car_id": "Car 1",
        "lat": 12.965000,
        "lon": 76.728000,
        "direction": "NORTH",
        "speed": 45
    },

    "vehicle_2": {
        "car_id": "Car 2",
        "lat": 12.968000,
        "lon": 76.730000,
        "direction": "SOUTH",
        "speed": 50
    },

    "vehicle_3": {
        "car_id": "Car 3",
        "lat": 12.980000,
        "lon": 76.740000,
        "direction": "NORTH",
        "speed": 40
    }
}

# Add to Firebase
db.reference("vehicles").set(vehicles)

print("✅ Vehicles added successfully to Firebase!")