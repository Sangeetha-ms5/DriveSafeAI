const FAST2SMS_URL = "https://www.fast2sms.com/dev/bulkV2";

function normalizePhoneNumber(phoneNumber) {
if (!phoneNumber) {
throw new Error("Phone number is required");
}


let phone = String(phoneNumber).replace(/\D/g, "");

if (phone.startsWith("91") && phone.length === 12) {
    phone = phone.substring(2);
}

if (!/^[6-9]\d{9}$/.test(phone)) {
    throw new Error("Invalid Indian mobile number");
}

return phone;


}

async function sendSMS(phoneNumber, message) {
try {
const phone = normalizePhoneNumber(phoneNumber);


    if (!process.env.FAST2SMS_API_KEY) {
        throw new Error("FAST2SMS_API_KEY is not configured");
    }

    if (!message || String(message).trim() === "") {
        throw new Error("SMS message is required");
    }

    console.log("Sending SMS to:", phone);

    const response = await fetch(
        FAST2SMS_URL,
        {
            method: "POST",
            headers: {
                Authorization: process.env.FAST2SMS_API_KEY,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                route: "q",
                message: String(message),
                numbers: phone
            })
        }
    );

    const data = await response.json();

    console.log("Fast2SMS response:", data);

    if (!response.ok) {
        throw new Error(
            data.message || "Fast2SMS request failed"
        );
    }

    if (data.return === false) {
        throw new Error(
            data.message || "Fast2SMS rejected the SMS"
        );
    }

    console.log("SMS submitted successfully");

    return {
        success: true,
        phone: phone,
        response: data
    };

} catch (error) {
    console.error(
        "SMS sending failed:",
        error.message
    );

    throw error;
}


}

async function sendAccidentSMS(
phoneNumber,
magnitude,
lat,
lon
) {
const message =
"ROAD SAFETY ALERT: ACCIDENT DETECTED. " +
"Impact magnitude: " +
Number(magnitude).toFixed(1) +
". Location: " +
Number(lat).toFixed(6) +
", " +
Number(lon).toFixed(6) +
". Please slow down and proceed carefully.";


console.log("Accident SMS:", message);

return await sendSMS(
    phoneNumber,
    message
);


}

async function sendHazardSMS(
phoneNumber,
magnitude,
lat,
lon
) {
const message =
"ROAD SAFETY ALERT: ROAD HAZARD DETECTED. " +
"Magnitude: " +
Number(magnitude).toFixed(1) +
". Location: " +
Number(lat).toFixed(6) +
", " +
Number(lon).toFixed(6) +
". Please slow down and drive carefully.";

console.log("Hazard SMS:", message);

return await sendSMS(
    phoneNumber,
    message
);


}

module.exports = {
sendSMS,
sendAccidentSMS,
sendHazardSMS
};
