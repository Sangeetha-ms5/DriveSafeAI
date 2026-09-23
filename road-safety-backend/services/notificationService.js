// services/notificationService.js

const {
    messaging
} = require("./firebase");

async function sendPushNotification(
    fcmToken,
    title,
    body,
    data = {}
) {

    if (!fcmToken) {

        console.log(
            "No FCM token available for this mobile."
        );

        return null;
    }

    const message = {

        token: fcmToken,

        notification: {
            title: title,
            body: body
        },

        data: {

            ...Object.fromEntries(
                Object.entries(data).map(
                    ([key, value]) => [
                        key,
                        String(value)
                    ]
                )
            )
        },

        android: {

            priority: "high",

            notification: {

                channelId: "road_safety_alerts",

                sound: "default",

                priority: "high"
            }
        }
    };

    try {

        const response =
            await messaging.send(message);

        console.log(
            "📱 Push notification sent:",
            response
        );

        return response;

    } catch (error) {

        console.error(
            "❌ FCM notification failed:",
            error.message
        );

        return null;
    }
}

module.exports = {
    sendPushNotification
};
