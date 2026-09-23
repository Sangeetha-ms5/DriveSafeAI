// routes/driving.js

const express = require("express");
const router = express.Router();

const { v4: uuidv4 } = require("uuid");

const { db } =
    require("../services/firebase");

const {
    sendPushNotification
} =
    require("../services/notificationService");

const {
    sendSMS
} =
    require("../services/smsService");


// ============================================================
// SETTINGS
// ============================================================

const WARNING_RADIUS = 1000; // 1 KM


// ============================================================
// HAVERSINE DISTANCE
// ============================================================

function distanceMeters(
    lat1,
    lon1,
    lat2,
    lon2
) {

    const R = 6371000;

    const p1 =
        lat1 * Math.PI / 180;

    const p2 =
        lat2 * Math.PI / 180;

    const dLat =
        (lat2 - lat1) *
        Math.PI / 180;

    const dLon =
        (lon2 - lon1) *
        Math.PI / 180;

    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(p1) *
        Math.cos(p2) *
        Math.sin(dLon / 2) ** 2;

    const c =
        2 *
        Math.atan2(
            Math.sqrt(a),
            Math.sqrt(1 - a)
        );

    return R * c;
}


// ============================================================
// NORMALIZE PHONE NUMBER
// ============================================================

function normalizePhoneNumber(
    phoneNumber
) {

    if (!phoneNumber) {
        return null;
    }

    let phone =
        String(phoneNumber)
            .replace(/\D/g, "");


    // Convert +91XXXXXXXXXX
    // or 91XXXXXXXXXX
    // into 10 digit number

    if (
        phone.startsWith("91") &&
        phone.length === 12
    ) {

        phone =
            phone.substring(2);
    }


    if (
        !/^[6-9]\d{9}$/.test(phone)
    ) {

        return null;
    }


    return phone;
}


// ============================================================
// START DRIVING
// ============================================================

router.post(
    "/start",
    async (req, res) => {

        try {

            const {
                deviceId,
                carId,
                fcmToken,
                phoneNumber,
                lat,
                lon
            } = req.body;


            // ------------------------------------------------
            // VALIDATION
            // ------------------------------------------------

            if (!deviceId) {

                return res.status(400).json({

                    success: false,

                    message:
                        "deviceId is required"
                });
            }


            if (!fcmToken) {

                return res.status(400).json({

                    success: false,

                    message:
                        "FCM token is required"
                });
            }


            if (!phoneNumber) {

                return res.status(400).json({

                    success: false,

                    message:
                        "phoneNumber is required for emergency SMS alerts"
                });
            }


            const normalizedPhone =
                normalizePhoneNumber(
                    phoneNumber
                );


            if (!normalizedPhone) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid Indian mobile number"
                });
            }


            if (
                lat === undefined ||
                lon === undefined
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "GPS latitude and longitude are required"
                });
            }


            const latitude =
                Number(lat);

            const longitude =
                Number(lon);


            if (
                !Number.isFinite(latitude) ||
                !Number.isFinite(longitude)
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid GPS coordinates"
                });
            }


            // ------------------------------------------------
            // CHECK EXISTING ACTIVE SESSION
            // ------------------------------------------------

            const existingRef =
                db.ref(
                    `active_drivers/${deviceId}`
                );


            const existingSnapshot =
                await existingRef.once(
                    "value"
                );


            let sessionId;


            if (
                existingSnapshot.exists()
            ) {

                const existing =
                    existingSnapshot.val();


                sessionId =
                    existing.sessionId;


                console.log(
                    "🚗 Existing driving session resumed:",
                    sessionId
                );

            } else {

                sessionId =
                    uuidv4();


                console.log(
                    "🚗 New driving session:",
                    sessionId
                );
            }


            // ------------------------------------------------
            // SESSION DATA
            // ------------------------------------------------

            const session = {

                sessionId,

                deviceId,

                carId:
                    carId || deviceId,

                fcmToken,

                phoneNumber:
                    normalizedPhone,

                startLocation: {

                    lat:
                        latitude,

                    lon:
                        longitude
                },

                currentLocation: {

                    lat:
                        latitude,

                    lon:
                        longitude
                },

                status:
                    "DRIVING",

                startedAt:
                    new Date().toISOString(),

                updatedAt:
                    new Date().toISOString()
            };


            // ------------------------------------------------
            // SAVE DRIVING SESSION
            // ------------------------------------------------

            await db
                .ref(
                    `driving_sessions/${sessionId}`
                )
                .set(session);


            // ------------------------------------------------
            // REGISTER ACTIVE DRIVER
            // ------------------------------------------------

            await db
                .ref(
                    `active_drivers/${deviceId}`
                )
                .set({

                    sessionId,

                    deviceId,

                    carId:
                        carId || deviceId,

                    fcmToken,

                    phoneNumber:
                        normalizedPhone,

                    lat:
                        latitude,

                    lon:
                        longitude,

                    status:
                        "DRIVING",

                    updatedAt:
                        new Date().toISOString()
                });


            console.log(
                "✅ Driver registered:",
                deviceId
            );


            console.log(
                "📱 Emergency SMS number:",
                normalizedPhone
            );


            // ------------------------------------------------
            // RESPONSE
            // ------------------------------------------------

            return res.json({

                success: true,

                message:
                    "Driving started successfully",

                sessionId,

                deviceId,

                carId:
                    carId || deviceId,

                phoneNumber:
                    normalizedPhone,

                warningRadius:
                    WARNING_RADIUS
            });


        } catch (error) {

            console.error(
                "❌ Start driving error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Failed to start driving",

                error:
                    error.message
            });
        }
    }
);


// ============================================================
// UPDATE DRIVER GPS
// ============================================================
//
// POST /api/driving/location
//
// ============================================================

router.post(
    "/location",
    async (req, res) => {

        try {

            const {
                deviceId,
                lat,
                lon,
                speed,
                direction
            } = req.body;


            if (!deviceId) {

                return res.status(400).json({

                    success: false,

                    message:
                        "deviceId is required"
                });
            }


            if (
                lat === undefined ||
                lon === undefined
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "GPS coordinates are required"
                });
            }


            const latitude =
                Number(lat);

            const longitude =
                Number(lon);


            if (
                !Number.isFinite(latitude) ||
                !Number.isFinite(longitude)
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid GPS coordinates"
                });
            }


            const driverRef =
                db.ref(
                    `active_drivers/${deviceId}`
                );


            const snapshot =
                await driverRef.once(
                    "value"
                );


            if (!snapshot.exists()) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Driver is not currently driving"
                });
            }


            const currentTime =
                new Date().toISOString();


            // ------------------------------------------------
            // UPDATE ACTIVE DRIVER
            // ------------------------------------------------

            await driverRef.update({

                lat:
                    latitude,

                lon:
                    longitude,

                speed:
                    speed !== undefined
                        ? Number(speed)
                        : 0,

                direction:
                    direction || "Unknown",

                updatedAt:
                    currentTime
            });


            // ------------------------------------------------
            // UPDATE SESSION
            // ------------------------------------------------

            const driver =
                snapshot.val();


            if (driver.sessionId) {

                await db
                    .ref(
                        `driving_sessions/${driver.sessionId}`
                    )
                    .update({

                        currentLocation: {

                            lat:
                                latitude,

                            lon:
                                longitude
                        },

                        speed:
                            speed !== undefined
                                ? Number(speed)
                                : 0,

                        direction:
                            direction ||
                            "Unknown",

                        updatedAt:
                            currentTime
                    });
            }


            return res.json({

                success: true,

                message:
                    "Driver location updated"
            });


        } catch (error) {

            console.error(
                "❌ Location update error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Failed to update location"
            });
        }
    }
);


// ============================================================
// STOP DRIVING
// ============================================================

router.post(
    "/stop",
    async (req, res) => {

        try {

            const {
                deviceId
            } = req.body;


            if (!deviceId) {

                return res.status(400).json({

                    success: false,

                    message:
                        "deviceId is required"
                });
            }


            const driverRef =
                db.ref(
                    `active_drivers/${deviceId}`
                );


            const snapshot =
                await driverRef.once(
                    "value"
                );


            if (!snapshot.exists()) {

                return res.json({

                    success: true,

                    message:
                        "No active driving session"
                });
            }


            const driver =
                snapshot.val();


            // ------------------------------------------------
            // UPDATE SESSION
            // ------------------------------------------------

            if (driver.sessionId) {

                await db
                    .ref(
                        `driving_sessions/${driver.sessionId}`
                    )
                    .update({

                        status:
                            "STOPPED",

                        stoppedAt:
                            new Date().toISOString()
                    });
            }


            // ------------------------------------------------
            // REMOVE ACTIVE DRIVER
            // ------------------------------------------------

            await driverRef.remove();


            console.log(
                "🛑 Driving stopped:",
                deviceId
            );


            return res.json({

                success: true,

                message:
                    "Driving session stopped",

                deviceId
            });


        } catch (error) {

            console.error(
                "❌ Stop driving error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Failed to stop driving"
            });
        }
    }
);


// ============================================================
// GET ACTIVE DRIVERS
// ============================================================

router.get(
    "/active",
    async (req, res) => {

        try {

            const snapshot =
                await db
                    .ref(
                        "active_drivers"
                    )
                    .once("value");


            const drivers =
                snapshot.val() || {};


            return res.json({

                success: true,

                count:
                    Object.keys(
                        drivers
                    ).length,

                drivers
            });


        } catch (error) {

            console.error(
                "❌ Active drivers error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Failed to fetch active drivers"
            });
        }
    }
);


// ============================================================
// ACCIDENT DETECTION
// ============================================================
//
// POST /api/driving/accident
//
// Example:
//
// {
//     "deviceId": "phone_123",
//     "carId": "CAR_19",
//     "lat": 12.522210,
//     "lon": 76.905717,
//     "magnitude": 22.20
// }
//
// RULE:
//
// magnitude < 10     = LOW
// 10 - 20            = MEDIUM
// magnitude > 20     = HIGH / ACCIDENT
//
// ============================================================

router.post(
    "/accident",
    async (req, res) => {

        try {

            const {
                deviceId,
                carId,
                lat,
                lon,
                magnitude,
                timestamp
            } = req.body;


            // ------------------------------------------------
            // VALIDATION
            // ------------------------------------------------

            if (
                lat === undefined ||
                lon === undefined ||
                magnitude === undefined
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "lat, lon and magnitude are required"
                });
            }


            const accidentLat =
                Number(lat);

            const accidentLon =
                Number(lon);

            const accidentMagnitude =
                Number(magnitude);


            if (
                !Number.isFinite(
                    accidentLat
                ) ||
                !Number.isFinite(
                    accidentLon
                ) ||
                !Number.isFinite(
                    accidentMagnitude
                )
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid accident data"
                });
            }


            // ------------------------------------------------
            // SEVERITY
            // ------------------------------------------------

            let severity;


            if (
                accidentMagnitude < 10
            ) {

                severity =
                    "LOW";

            } else if (
                accidentMagnitude <= 20
            ) {

                severity =
                    "MEDIUM";

            } else {

                severity =
                    "HIGH";
            }


            // ------------------------------------------------
            // SAVE EVENT
            // ------------------------------------------------

            const accidentData = {

                type:
                    severity === "HIGH"
                        ? "ACCIDENT"
                        : "ROAD_EVENT",

                deviceId:
                    deviceId ||
                    "UNKNOWN",

                carId:
                    carId ||
                    "UNKNOWN",

                lat:
                    accidentLat,

                lon:
                    accidentLon,

                magnitude:
                    accidentMagnitude,

                severity,

                timestamp:
                    timestamp ||
                    new Date().toISOString()
            };


            const eventRef =
                db
                    .ref("events")
                    .push();


            await eventRef.set({

                eventId:
                    eventRef.key,

                ...accidentData
            });


            console.log(
                "🚨 Road event detected:",
                accidentData
            );


            // =================================================
            // LOW
            // =================================================

            if (
                severity === "LOW"
            ) {

                return res.json({

                    success: true,

                    severity:
                        "LOW",

                    message:
                        "Low magnitude event. No alert required.",

                    vehiclesAlerted:
                        0,

                    smsSent:
                        0
                });
            }


            // =================================================
            // MEDIUM — ROAD HAZARD
            // =================================================

            if (
                severity === "MEDIUM"
            ) {

                const nearbyDrivers =
                    await findNearbyDrivers(

                        accidentLat,

                        accidentLon,

                        carId
                    );


                const notification = {

                    title:
                        "🚧 ROAD HAZARD DETECTED",

                    body:
                        `Road hazard detected nearby. Magnitude ${accidentMagnitude}. Please slow down and drive carefully.`,

                    data: {

                        type:
                            "ROAD_HAZARD",

                        severity:
                            "MEDIUM",

                        lat:
                            String(
                                accidentLat
                            ),

                        lon:
                            String(
                                accidentLon
                            ),

                        magnitude:
                            String(
                                accidentMagnitude
                            )
                    }
                };


                const result =
                    await notifyDrivers(

                        nearbyDrivers,

                        notification
                    );


                return res.json({

                    success: true,

                    severity:
                        "MEDIUM",

                    message:
                        "Road hazard warning sent to nearby drivers",

                    vehiclesFound:
                        nearbyDrivers.length,

                    vehiclesAlerted:
                        result.sent,

                    pushFailed:
                        result.failed,

                    smsSent:
                        0
                });
            }


            // =================================================
            // HIGH — ACCIDENT
            // =================================================

            if (
                severity === "HIGH"
            ) {

                console.log(
                    "🚨 HIGH MAGNITUDE ACCIDENT:",
                    accidentMagnitude
                );


                // ------------------------------------------------
                // FIND ACCIDENT DRIVER
                // ------------------------------------------------

                const accidentDriver =
                    await findAccidentDriver(

                        carId,

                        deviceId
                    );


                // ------------------------------------------------
                // FIND NEARBY VEHICLES
                // ------------------------------------------------

                const nearbyDrivers =
                    await findNearbyDrivers(

                        accidentLat,

                        accidentLon,

                        carId
                    );


                // ------------------------------------------------
                // FCM PUSH NOTIFICATION
                // ------------------------------------------------

                const notification = {

                    title:
                        "🚨 ACCIDENT DETECTED",

                    body:
                        `Accident detected within 1 km. Magnitude ${accidentMagnitude}. Slow down and change route.`,

                    data: {

                        type:
                            "ACCIDENT",

                        severity:
                            "HIGH",

                        lat:
                            String(
                                accidentLat
                            ),

                        lon:
                            String(
                                accidentLon
                            ),

                        magnitude:
                            String(
                                accidentMagnitude
                            ),

                        warningRadius:
                            String(
                                WARNING_RADIUS
                            )
                    }
                };


                const pushResult =
                    await notifyDrivers(

                        nearbyDrivers,

                        notification
                    );


                // =================================================
                // SMS RECIPIENTS
                // =================================================

                const smsRecipients = [];


                // ------------------------------------------------
                // ADD ACCIDENT VEHICLE
                // ------------------------------------------------

                if (
                    accidentDriver &&
                    accidentDriver.phoneNumber
                ) {

                    smsRecipients.push({

                        phoneNumber:
                            accidentDriver.phoneNumber,

                        deviceId:
                            accidentDriver.deviceId,

                        type:
                            "ACCIDENT_VEHICLE"
                    });
                }


                // ------------------------------------------------
                // ADD NEARBY VEHICLES
                // ------------------------------------------------

                for (
                    const driver of
                    nearbyDrivers
                ) {

                    if (
                        driver.phoneNumber
                    ) {

                        smsRecipients.push({

                            phoneNumber:
                                driver.phoneNumber,

                            deviceId:
                                driver.deviceId,

                            type:
                                "NEARBY_VEHICLE"
                        });
                    }
                }


                // =================================================
                // REMOVE DUPLICATE PHONE NUMBERS
                // =================================================

                const uniqueSMSRecipients =
                    [];


                const usedNumbers =
                    new Set();


                for (
                    const recipient of
                    smsRecipients
                ) {

                    const normalized =
                        normalizePhoneNumber(

                            recipient.phoneNumber
                        );


                    if (
                        normalized &&
                        !usedNumbers.has(
                            normalized
                        )
                    ) {

                        usedNumbers.add(
                            normalized
                        );


                        uniqueSMSRecipients.push({

                            ...recipient,

                            phoneNumber:
                                normalized
                        });
                    }
                }


                // =================================================
                // SMS MESSAGE
                // =================================================

                const smsMessage =
                    `ROAD SAFETY ALERT: Accident detected. Magnitude ${accidentMagnitude}. Location: ${accidentLat}, ${accidentLon}. Please slow down and take an alternate route if possible.`;


                let smsSent =
                    0;

                let smsFailed =
                    0;


                const smsResults =
                    [];


                // =================================================
                // SEND REAL SMS
                // =================================================

                for (
                    const recipient of
                    uniqueSMSRecipients
                ) {

                    try {

                        await sendSMS(

                            recipient.phoneNumber,

                            smsMessage
                        );


                        smsSent++;


                        smsResults.push({

                            deviceId:
                                recipient.deviceId,

                            phoneNumber:
                                recipient.phoneNumber,

                            type:
                                recipient.type,

                            status:
                                "SENT"
                        });


                        console.log(

                            "📱 REAL SMS SENT:",

                            recipient.phoneNumber

                        );


                    } catch (
                        smsError
                    ) {

                        smsFailed++;


                        smsResults.push({

                            deviceId:
                                recipient.deviceId,

                            phoneNumber:
                                recipient.phoneNumber,

                            type:
                                recipient.type,

                            status:
                                "FAILED",

                            error:
                                smsError.message
                        });


                        console.error(

                            "❌ SMS FAILED:",

                            recipient.phoneNumber,

                            smsError.message

                        );
                    }
                }


                // =================================================
                // SAVE EMERGENCY ALERT
                // =================================================

                const emergencyRef =
                    db
                        .ref(
                            "emergency_alerts"
                        )
                        .push();


                await emergencyRef.set({

                    alertId:
                        emergencyRef.key,

                    ...accidentData,

                    priority:
                        "HIGH",

                    warningRadius:
                        WARNING_RADIUS,

                    vehiclesFound:
                        nearbyDrivers.length,

                    vehiclesAlerted:
                        pushResult.sent,

                    pushFailed:
                        pushResult.failed,

                    smsRecipients:
                        uniqueSMSRecipients.length,

                    smsSent,

                    smsFailed,

                    smsResults,

                    createdAt:
                        new Date().toISOString()
                });


                // =================================================
                // RESPONSE
                // =================================================

                return res.json({

                    success: true,

                    severity:
                        "HIGH",

                    message:
                        "🚨 ACCIDENT detected. Push notifications and SMS alerts processed.",

                    magnitude:
                        accidentMagnitude,

                    vehiclesFound:
                        nearbyDrivers.length,

                    vehiclesAlerted:
                        pushResult.sent,

                    pushFailed:
                        pushResult.failed,

                    smsRecipients:
                        uniqueSMSRecipients.length,

                    smsSent,

                    smsFailed,

                    accidentDriverFound:
                        !!accidentDriver,

                    accidentLocation: {

                        lat:
                            accidentLat,

                        lon:
                            accidentLon
                    }
                });
            }


        } catch (error) {

            console.error(
                "❌ Accident processing error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Failed to process accident",

                error:
                    error.message
            });
        }
    }
);


// ============================================================
// FIND ACCIDENT VEHICLE / DRIVER
// ============================================================

async function findAccidentDriver(

    accidentCarId,

    accidentDeviceId

) {

    try {

        const snapshot =
            await db
                .ref(
                    "active_drivers"
                )
                .once("value");


        const drivers =
            snapshot.val() || {};


        for (
            const deviceId of
            Object.keys(drivers)
        ) {

            const driver =
                drivers[deviceId];


            // -----------------------------------------------
            // Match device ID
            // -----------------------------------------------

            if (
                accidentDeviceId &&
                deviceId ===
                    accidentDeviceId
            ) {

                return {

                    deviceId,

                    ...driver
                };
            }


            // -----------------------------------------------
            // Match car ID
            // -----------------------------------------------

            if (
                accidentCarId &&
                driver.carId ===
                    accidentCarId
            ) {

                return {

                    deviceId,

                    ...driver
                };
            }
        }


        return null;


    } catch (error) {

        console.error(
            "❌ Find accident driver error:",
            error
        );

        return null;
    }
}


// ============================================================
// FIND DRIVERS WITHIN 1 KM
// ============================================================

async function findNearbyDrivers(

    accidentLat,

    accidentLon,

    accidentCarId

) {

    const snapshot =
        await db
            .ref(
                "active_drivers"
            )
            .once("value");


    const drivers =
        snapshot.val() || {};


    const nearbyDrivers =
        [];


    Object.keys(drivers)
        .forEach(
            deviceId => {

                const driver =
                    drivers[deviceId];


                // -------------------------------------------
                // INVALID GPS
                // -------------------------------------------

                if (
                    !Number.isFinite(
                        Number(
                            driver.lat
                        )
                    ) ||
                    !Number.isFinite(
                        Number(
                            driver.lon
                        )
                    )
                ) {

                    return;
                }


                // -------------------------------------------
                // DON'T ALERT ACCIDENT VEHICLE
                // -------------------------------------------

                if (
                    driver.carId &&
                    accidentCarId &&
                    driver.carId ===
                        accidentCarId
                ) {

                    return;
                }


                const distance =
                    distanceMeters(

                        accidentLat,

                        accidentLon,

                        Number(
                            driver.lat
                        ),

                        Number(
                            driver.lon
                        )
                    );


                // -------------------------------------------
                // WITHIN 1 KM
                // -------------------------------------------

                if (
                    distance <=
                    WARNING_RADIUS
                ) {

                    nearbyDrivers.push({

                        deviceId,

                        carId:
                            driver.carId ||
                            deviceId,

                        fcmToken:
                            driver.fcmToken,

                        phoneNumber:
                            driver.phoneNumber,

                        lat:
                            Number(
                                driver.lat
                            ),

                        lon:
                            Number(
                                driver.lon
                            ),

                        speed:
                            driver.speed ||
                            0,

                        direction:
                            driver.direction ||
                            "Unknown",

                        distance
                    });
                }
            }
        );


    // -----------------------------------------------
    // NEAREST FIRST
    // -----------------------------------------------

    nearbyDrivers.sort(

        (a, b) =>
            a.distance -
            b.distance
    );


    console.log(

        `📡 ${nearbyDrivers.length} vehicles within 1 km`

    );


    return nearbyDrivers;
}


// ============================================================
// SEND PUSH NOTIFICATIONS
// ============================================================

async function notifyDrivers(

    drivers,

    notification

) {

    let sent =
        0;

    let failed =
        0;


    for (
        const driver of
        drivers
    ) {

        if (
            !driver.fcmToken
        ) {

            console.warn(

                "⚠️ No FCM token:",

                driver.deviceId

            );


            failed++;

            continue;
        }


        try {

            await sendPushNotification(

                driver.fcmToken,

                notification
            );


            sent++;


            console.log(

                "📱 Push alert sent to:",

                driver.deviceId

            );


        } catch (error) {

            failed++;


            console.error(

                "❌ Push notification failed for:",

                driver.deviceId,

                error.message

            );
        }
    }


    return {

        sent,

        failed
    };
}


// ============================================================
// EXPORT ROUTER
// ============================================================

module.exports =
    router;