// server.js

require("dotenv").config();

const express = require("express");
const cors = require("cors");

// ===============================================
// EXPRESS APP
// ===============================================

const app = express();

// ===============================================
// PORT
// ===============================================

const PORT = process.env.PORT || 5000;

// ===============================================
// MIDDLEWARE
// ===============================================

app.use(cors());

app.use(express.json());

app.use(
    express.urlencoded({
        extended: true
    })
);

// ===============================================
// FIREBASE
// ===============================================

const { db } = require("./services/firebase");

// ===============================================
// ROUTES
// ===============================================

const drivingRoutes =
    require("./routes/driving");

const distanceRoutes =
    require("./routes/distance");

const sensorRoutes =
    require("./routes/sensor");

const eventRoutes =
    require("./routes/event");

// ===============================================
// API ROUTES
// ===============================================

app.use(
    "/api/driving",
    drivingRoutes
);

app.use(
    "/api/distance",
    distanceRoutes
);

app.use(
    "/api/sensor",
    sensorRoutes
);

// NEW: Sensor event + accident SMS route

app.use(
    "/api/events",
    eventRoutes
);

// ===============================================
// HEALTH CHECK
// ===============================================

app.get(
    "/",
    (req, res) => {

        res.json({

            success: true,

            message:
                "🚗 Road Safety V2V Backend is running",

            status:
                "ONLINE",

            services: {

                firebase:
                    "CONNECTED",

                driving:
                    "/api/driving",

                distance:
                    "/api/distance",

                sensor:
                    "/api/sensor",

                events:
                    "/api/events"
            }
        });
    }
);

// ===============================================
// SERVER STATUS
// ===============================================

app.get(
    "/api/status",
    async (req, res) => {

        try {

            const snapshot =
                await db
                    .ref(".info/connected")
                    .once("value");

            const firebaseConnected =
                snapshot.val() === true;

            res.json({

                success: true,

                server:
                    "ONLINE",

                firebase:
                    firebaseConnected
                        ? "CONNECTED"
                        : "DISCONNECTED",

                services: {

                    driving:
                        "ACTIVE",

                    distance:
                        "ACTIVE",

                    sensor:
                        "ACTIVE",

                    events:
                        "ACTIVE",

                    sms:
                        process.env.FAST2SMS_API_KEY
                            ? "CONFIGURED"
                            : "NOT CONFIGURED"
                },

                timestamp:
                    new Date().toISOString()
            });

        } catch (error) {

            console.error(
                "Status error:",
                error
            );

            res.status(500).json({

                success: false,

                server:
                    "ONLINE",

                firebase:
                    "ERROR",

                error:
                    error.message
            });
        }
    }
);

// ===============================================
// 404 HANDLER
// ===============================================

app.use(
    (req, res) => {

        res.status(404).json({

            success: false,

            message:
                "API endpoint not found",

            path:
                req.originalUrl
        });
    }
);

// ===============================================
// GLOBAL ERROR HANDLER
// ===============================================

app.use(
    (error, req, res, next) => {

        console.error(
            "Server error:",
            error
        );

        res.status(
            error.status || 500
        ).json({

            success: false,

            message:
                error.message ||
                "Internal server error"
        });
    }
);

// ===============================================
// START SERVER
// ===============================================

function logServerStarted() {

        console.log(
            "=============================================="
        );

        console.log(
            "🚗 ROAD SAFETY V2V BACKEND"
        );

        console.log(
            "=============================================="
        );

        console.log(
            `🚀 Server running on port ${PORT}`
        );

        console.log(
            `🌐 http://localhost:${PORT}`
        );

        console.log(
            `📡 Driving API: /api/driving`
        );

        console.log(
            `📍 Distance API: /api/distance`
        );

        console.log(
            `📱 Sensor API: /api/sensor`
        );

        console.log(
            `🚨 Events API: /api/events`
        );

        console.log(
            `📩 SMS: ${
                process.env.FAST2SMS_API_KEY
                    ? "CONFIGURED"
                    : "NOT CONFIGURED"
            }`
        );

        console.log(
            `❤️ Health: /`
        );

        console.log(
            `📊 Status: /api/status`
        );

        console.log(
            "=============================================="
        );
}

if (require.main === module) {
    app.listen(PORT, "0.0.0.0", logServerStarted);
}

module.exports = app;
