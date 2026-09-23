const express = require("express");
const router = express.Router();

const { db } = require("../services/firebase");
const {
    sendAccidentSMS,
    sendHazardSMS
} = require("../services/smsService");

// ============================================================
// SETTINGS
// ============================================================

const ACCIDENT_THRESHOLD = 20;

// ============================================================
// CREATE SENSOR EVENT
// POST /api/events
// ============================================================
//
// Body:
//
// {
//     "deviceId": "DEVICE_123",
//     "carId": "CAR_19",
//     "lat": 12.522210,
//     "lon": 76.905717,
//     "magnitude": 22.2
// }
//
// ============================================================

router.post("/", async (req, res) => {
    try {
        const {
            deviceId,
            carId,
            phoneNumber,
            lat,
            lon,
            magnitude,
            accelX,
            accelY,
            accelZ,
            timestamp
        } = req.body;

        // ----------------------------------------------------
        // VALIDATION
        // ----------------------------------------------------

        if (!deviceId) {
            return res.status(400).json({
                success: false,
                message: "deviceId is required"
            });
        }

        if (
            lat === undefined ||
            lon === undefined ||
            magnitude === undefined
        ) {
            return res.status(400).json({
                success: false,
                message: "lat, lon and magnitude are required"
            });
        }

        const eventLat = Number(lat);
        const eventLon = Number(lon);
        const eventMagnitude = Number(magnitude);
        const eventAccelX = Number(accelX);
        const eventAccelY = Number(accelY);
        const eventAccelZ = Number(accelZ);

        if (
            !Number.isFinite(eventLat) ||
            !Number.isFinite(eventLon) ||
            !Number.isFinite(eventMagnitude)
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid event data"
            });
        }

        // ----------------------------------------------------
        // SEVERITY DETECTION
        // ----------------------------------------------------

        let severity;
        let eventType;

        if (eventMagnitude < 10) {
            severity = "LOW";
            eventType = "NORMAL";
        } else if (eventMagnitude <= ACCIDENT_THRESHOLD) {
            severity = "MEDIUM";
            eventType = "ROAD_HAZARD";
        } else {
            severity = "HIGH";
            eventType = "ACCIDENT";
        }

        // ----------------------------------------------------
        // SAVE EVENT TO FIREBASE
        // ----------------------------------------------------

        const eventRef = db.ref("events").push();

        const eventData = {
            eventId: eventRef.key,
            deviceId,
            carId: carId || deviceId,
            car_id: carId || deviceId,
            phoneNumber: phoneNumber || null,
            lat: eventLat,
            lon: eventLon,
            latitude: eventLat,
            longitude: eventLon,
            magnitude: eventMagnitude,
            accel_x: Number.isFinite(eventAccelX) ? eventAccelX : null,
            accel_y: Number.isFinite(eventAccelY) ? eventAccelY : null,
            accel_z: Number.isFinite(eventAccelZ) ? eventAccelZ : null,
            accelerometer: {
                x: Number.isFinite(eventAccelX) ? eventAccelX : null,
                y: Number.isFinite(eventAccelY) ? eventAccelY : null,
                z: Number.isFinite(eventAccelZ) ? eventAccelZ : null
            },
            severity,
            type: eventType,
            timestamp:
                timestamp || new Date().toISOString()
        };

        const carKey = String(eventData.carId)
            .replace(/[.#$\/\[\]]/g, "_");

        await db.ref().update({
            [`events/${eventRef.key}`]: eventData,
            [`car_events/${carKey}/${eventRef.key}`]: eventData
        });

        console.log("📡 Sensor event received:", eventData);

        // ====================================================
        // LOW EVENT
        // ====================================================

        if (severity === "LOW") {
            return res.json({
                success: true,
                severity: "LOW",
                eventType: "NORMAL",
                message: "Low magnitude event detected",
                smsSent: false
            });
        }

        // ====================================================
        // MEDIUM EVENT
        // ====================================================

        if (severity === "MEDIUM") {
            let smsSent = false;

            if (phoneNumber) {
                try {
                    await sendHazardSMS(
                        phoneNumber,
                        eventMagnitude,
                        eventLat,
                        eventLon
                    );
                    smsSent = true;
                } catch (smsError) {
                    console.error("Hazard SMS failed:", smsError.message);
                }
            }

            return res.json({
                success: true,
                severity: "MEDIUM",
                eventType: "ROAD_HAZARD",
                message: "Road hazard detected",
                smsSent
            });
        }

        // ====================================================
        // HIGH EVENT = ACCIDENT
        // ====================================================

        // Find the driver who clicked Start Driving

        const driverSnapshot = await db
            .ref(`active_drivers/${deviceId}`)
            .once("value");

        if (!driverSnapshot.exists() && !phoneNumber) {
            console.warn(
                "⚠️ Accident detected but driver is not active:",
                deviceId
            );

            return res.json({
                success: true,
                severity: "HIGH",
                eventType: "ACCIDENT",
                message:
                    "Accident detected, but no active driver session found",
                smsSent: false
            });
        }

        const driver = driverSnapshot.exists()
            ? driverSnapshot.val()
            : {
                carId: carId || deviceId,
                phoneNumber
            };

        const recipientPhoneNumber =
            driver.phoneNumber || phoneNumber;

        // ----------------------------------------------------
        // NO PHONE NUMBER
        // ----------------------------------------------------

        if (!recipientPhoneNumber) {
            console.warn(
                "⚠️ No phone number registered for:",
                deviceId
            );

            return res.json({
                success: true,
                severity: "HIGH",
                eventType: "ACCIDENT",
                message:
                    "Accident detected, but no phone number is registered",
                smsSent: false
            });
        }

        // ====================================================
        // SEND REAL SMS
        // ====================================================

        let smsSent = false;
        let smsResult = null;

        try {
            smsResult = await sendAccidentSMS(
                recipientPhoneNumber,
                eventMagnitude,
                eventLat,
                eventLon
            );

            smsSent = true;

            console.log(
                `📩 Accident SMS sent to ${recipientPhoneNumber}`
            );

        } catch (smsError) {
            console.error(
                "❌ Accident SMS failed:",
                smsError.message
            );
        }

        // ----------------------------------------------------
        // SAVE EMERGENCY ALERT
        // ----------------------------------------------------

        const alertRef = db
            .ref("emergency_alerts")
            .push();

        await alertRef.set({
            alertId: alertRef.key,
            deviceId,
            carId: driver.carId || deviceId,
            phoneNumber: recipientPhoneNumber,
            lat: eventLat,
            lon: eventLon,
            magnitude: eventMagnitude,
            severity: "HIGH",
            type: "ACCIDENT",
            smsSent,
            createdAt: new Date().toISOString()
        });

        // ====================================================
        // RESPONSE
        // ====================================================

        return res.json({
            success: true,
            severity: "HIGH",
            eventType: "ACCIDENT",
            message: smsSent
                ? "Accident detected and real SMS sent successfully"
                : "Accident detected but SMS could not be sent",
            phoneNumber,
            smsSent,
            eventId: eventRef.key
        });

    } catch (error) {
        console.error(
            "❌ Event processing error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to process sensor event",
            error: error.message
        });
    }
});

module.exports = router;