const express = require("express");

const router = express.Router();

const { db } = require("../services/firebase");

const {
getSeverity,
getAlertMessage
} = require("../services/severityService");

const {
sendPushNotification
} = require("../services/notificationService");

// ===============================================
// SENSOR EVENT
// POST /api/sensor/event
// ===============================================

router.post("/event", async (req, res) => {

try {

    const {
        deviceId,
        sessionId,
        carId,
        magnitude,
        lat,
        lon,
        speed,
        direction,
        accelX,
        accelY,
        accelZ
    } = req.body;


    // =========================================
    // VALIDATION
    // =========================================

    if (!deviceId) {

        return res.status(400).json({
            success: false,
            message: "deviceId is required"
        });

    }


    const magnitudeValue = Number(magnitude);
    const latitude = Number(lat);
    const longitude = Number(lon);
    const accelerationX = Number(accelX);
    const accelerationY = Number(accelY);
    const accelerationZ = Number(accelZ);


    if (
        !Number.isFinite(magnitudeValue) ||
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude)
    ) {

        return res.status(400).json({
            success: false,
            message: "Invalid sensor/GPS data"
        });

    }


    // =========================================
    // FIND ACTIVE DRIVER
    // =========================================

    const driverSnapshot = await db
        .ref("active_drivers/" + deviceId)
        .once("value");


    if (!driverSnapshot.exists()) {

        return res.status(400).json({
            success: false,
            message: "Mobile is not currently driving"
        });

    }


    const driver = driverSnapshot.val();


    // =========================================
    // DETECT SEVERITY
    // =========================================

    const severity = getSeverity(magnitudeValue);

    const alertMessage = getAlertMessage(severity);


    // =========================================
    // CREATE EVENT
    // =========================================

    const event = {

        deviceId: deviceId,

        sessionId:
            sessionId || driver.sessionId || null,

        carId:
            carId || driver.carId || null,

        magnitude:
            magnitudeValue,

        severity:
            severity,

        lat:
            latitude,

        lon:
            longitude,

        latitude:
            latitude,

        longitude:
            longitude,

        accel_x:
            Number.isFinite(accelerationX) ? accelerationX : null,

        accel_y:
            Number.isFinite(accelerationY) ? accelerationY : null,

        accel_z:
            Number.isFinite(accelerationZ) ? accelerationZ : null,

        accelerometer: {
            x: Number.isFinite(accelerationX) ? accelerationX : null,
            y: Number.isFinite(accelerationY) ? accelerationY : null,
            z: Number.isFinite(accelerationZ) ? accelerationZ : null
        },

        speed:
            Number(speed || 0),

        direction:
            direction || "Unknown",

        timestamp:
            new Date().toISOString()

    };


    // =========================================
    // SAVE EVENT
    // =========================================

    const eventRef = db.ref("events").push();
    const eventId = eventRef.key;
    const carKey = String(event.carId || deviceId)
        .replace(/[.#$\/\[\]]/g, "_");

    await db.ref().update({
        [`events/${eventId}`]: {
            ...event,
            eventId,
            car_id: event.carId || deviceId
        },
        [`car_events/${carKey}/${eventId}`]: {
            ...event,
            eventId,
            car_id: event.carId || deviceId
        }
    });


    console.log("📡 Sensor event:", event);


    // =========================================
    // LOW SEVERITY
    // =========================================

    if (severity === "LOW") {

        return res.json({

            success: true,

            eventId: eventId,

            severity: severity,

            alertSent: false,

            message:
                "Low magnitude. No alert required."

        });

    }


    // =========================================
    // MEDIUM SEVERITY
    // =========================================

    if (severity === "MEDIUM") {

        await db
            .ref("road_hazards/" + eventId)
            .set({

                ...event,

                type: "ROAD_HAZARD"

            });


        // -------------------------------------
        // SEND PUSH NOTIFICATION
        // -------------------------------------

        let notificationSent = false;


        if (driver.fcmToken) {

            try {

                await sendPushNotification(

                    driver.fcmToken,

                    alertMessage.title,

                    alertMessage.body,

                    {

                        type: "ROAD_HAZARD",

                        severity: severity,

                        eventId: eventId,

                        lat: latitude,

                        lon: longitude,

                        magnitude: magnitudeValue

                    }

                );

                notificationSent = true;

            } catch (notificationError) {

                console.error(
                    "❌ Push notification failed:",
                    notificationError.message
                );

            }

        } else {

            console.log(
                "⚠️ No FCM token available for driver"
            );

        }


        return res.json({

            success: true,

            eventId: eventId,

            severity: severity,

            alertSent: notificationSent,

            message:
                "Road hazard detected."

        });

    }


    // =========================================
    // HIGH SEVERITY
    // =========================================

    if (severity === "HIGH") {

        // -------------------------------------
        // SAVE ACCIDENT
        // -------------------------------------

        await db
            .ref("accidents/" + eventId)
            .set({

                ...event,

                type: "ACCIDENT",

                emergency: true

            });


        // -------------------------------------
        // SEND PUSH NOTIFICATION
        // -------------------------------------

        let notificationSent = false;


        if (driver.fcmToken) {

            try {

                await sendPushNotification(

                    driver.fcmToken,

                    alertMessage.title,

                    alertMessage.body,

                    {

                        type: "ACCIDENT",

                        severity: severity,

                        eventId: eventId,

                        lat: latitude,

                        lon: longitude,

                        magnitude: magnitudeValue

                    }

                );

                notificationSent = true;

            } catch (notificationError) {

                console.error(
                    "❌ Push notification failed:",
                    notificationError.message
                );

            }

        } else {

            console.log(
                "⚠️ No FCM token available for driver"
            );

        }


        // -------------------------------------
        // SAVE EMERGENCY ALERT
        // -------------------------------------

        await db
            .ref("emergency_alerts/" + eventId)
            .set({

                eventId: eventId,

                deviceId: deviceId,

                carId:
                    driver.carId || carId || null,

                lat:
                    latitude,

                lon:
                    longitude,

                magnitude:
                    magnitudeValue,

                severity:
                    "HIGH",

                timestamp:
                    new Date().toISOString(),

                status:
                    "PENDING"

            });


        console.log(
            "🚨 ACCIDENT DETECTED"
        );


        return res.json({

            success: true,

            eventId: eventId,

            severity: severity,

            alertSent: notificationSent,

            emergency: true,

            message:
                "Accident detected. Emergency alert created."

        });

    }


    // =========================================
    // UNKNOWN SEVERITY
    // =========================================

    return res.status(400).json({

        success: false,

        message:
            "Unknown severity returned by severityService"

    });


} catch (error) {

    console.error(
        "❌ Sensor processing error:",
        error
    );


    return res.status(500).json({

        success: false,

        message:
            "Sensor event processing failed",

        error:
            error.message

    });

}

});

// ===============================================
// EXPORT ROUTER
// ===============================================

module.exports = router;
