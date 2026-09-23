// routes/distance.js

const express = require("express");
const router = express.Router();

const { db } = require("../services/firebase");

// ===============================================
// SETTINGS
// ===============================================

const WARNING_RADIUS = 1000; // 1 KM


// ===============================================
// HAVERSINE DISTANCE
// Returns distance in meters
// ===============================================

function calculateDistance(
    lat1,
    lon1,
    lat2,
    lon2
) {

    const R = 6371000; // Earth radius in meters

    const p1 =
        Number(lat1) * Math.PI / 180;

    const p2 =
        Number(lat2) * Math.PI / 180;

    const deltaLat =
        (Number(lat2) - Number(lat1))
        * Math.PI / 180;

    const deltaLon =
        (Number(lon2) - Number(lon1))
        * Math.PI / 180;


    const a =
        Math.sin(deltaLat / 2) ** 2 +
        Math.cos(p1) *
        Math.cos(p2) *
        Math.sin(deltaLon / 2) ** 2;


    const c =
        2 *
        Math.atan2(
            Math.sqrt(a),
            Math.sqrt(1 - a)
        );


    return R * c;
}


// ===============================================
// CHECK WHETHER DRIVER IS WITHIN 1 KM
// ===============================================

router.post("/check", async (req, res) => {

    try {

        const {
            accidentLat,
            accidentLon,
            excludeDeviceId
        } = req.body;


        // ---------------------------------------
        // VALIDATION
        // ---------------------------------------

        if (
            accidentLat === undefined ||
            accidentLon === undefined
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "accidentLat and accidentLon are required"
            });
        }


        const lat =
            Number(accidentLat);

        const lon =
            Number(accidentLon);


        if (
            !Number.isFinite(lat) ||
            !Number.isFinite(lon)
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid accident GPS coordinates"
            });
        }


        // ---------------------------------------
        // GET ACTIVE DRIVERS
        // ---------------------------------------

        const snapshot =
            await db
                .ref("active_drivers")
                .once("value");


        const drivers =
            snapshot.val() || {};


        const nearbyDrivers = [];


        // ---------------------------------------
        // CHECK EACH ACTIVE DRIVER
        // ---------------------------------------

        Object.keys(drivers)
            .forEach(deviceId => {

                const driver =
                    drivers[deviceId];


                // Do not alert accident vehicle
                if (
                    excludeDeviceId &&
                    deviceId === excludeDeviceId
                ) {

                    return;
                }


                // Driver GPS must exist

                if (
                    driver.lat === undefined ||
                    driver.lon === undefined
                ) {

                    return;
                }


                const driverLat =
                    Number(driver.lat);

                const driverLon =
                    Number(driver.lon);


                if (
                    !Number.isFinite(driverLat) ||
                    !Number.isFinite(driverLon)
                ) {

                    return;
                }


                // --------------------------------
                // CALCULATE DISTANCE
                // --------------------------------

                const distance =
                    calculateDistance(
                        lat,
                        lon,
                        driverLat,
                        driverLon
                    );


                // --------------------------------
                // WITHIN 1 KM
                // --------------------------------

                if (
                    distance <= WARNING_RADIUS
                ) {

                    nearbyDrivers.push({

                        deviceId,

                        carId:
                            driver.carId ||
                            deviceId,

                        fcmToken:
                            driver.fcmToken ||
                            null,

                        lat:
                            driverLat,

                        lon:
                            driverLon,

                        distance:
                            Math.round(distance),

                        distanceKm:
                            Number(
                                (
                                    distance / 1000
                                ).toFixed(2)
                            ),

                        status:
                            driver.status ||
                            "DRIVING"
                    });
                }

            });


        // ---------------------------------------
        // SORT NEAREST FIRST
        // ---------------------------------------

        nearbyDrivers.sort(
            (a, b) =>
                a.distance -
                b.distance
        );


        // ---------------------------------------
        // RESPONSE
        // ---------------------------------------

        return res.json({

            success: true,

            warningRadius:
                WARNING_RADIUS,

            accidentLocation: {

                lat,

                lon
            },

            nearbyDriverCount:
                nearbyDrivers.length,

            nearbyDrivers

        });

    } catch (error) {

        console.error(
            "Distance calculation error:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Failed to calculate nearby drivers",

            error:
                error.message
        });
    }
});


// ===============================================
// GET DISTANCE BETWEEN TWO LOCATIONS
// ===============================================

router.post("/calculate", async (req, res) => {

    try {

        const {
            lat1,
            lon1,
            lat2,
            lon2
        } = req.body;


        if (
            lat1 === undefined ||
            lon1 === undefined ||
            lat2 === undefined ||
            lon2 === undefined
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "lat1, lon1, lat2 and lon2 are required"
            });
        }


        const distance =
            calculateDistance(
                lat1,
                lon1,
                lat2,
                lon2
            );


        return res.json({

            success: true,

            distanceMeters:
                Math.round(distance),

            distanceKm:
                Number(
                    (
                        distance / 1000
                    ).toFixed(3)
                ),

            withinWarningRadius:
                distance <= WARNING_RADIUS
        });

    } catch (error) {

        console.error(error);


        return res.status(500).json({

            success: false,

            message:
                "Distance calculation failed"
        });
    }
});


module.exports = router;