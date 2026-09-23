// services/severityService.js

function getSeverity(magnitude) {

    const value = Number(magnitude);

    if (!Number.isFinite(value)) {
        return "LOW";
    }

    if (value < 10) {
        return "LOW";
    }

    if (value <= 20) {
        return "MEDIUM";
    }

    return "HIGH";
}

function getAlertMessage(severity) {

    if (severity === "LOW") {

        return {
            title: "🟢 Road Safety",
            body: "Low magnitude detected. No alert required."
        };
    }

    if (severity === "MEDIUM") {

        return {
            title: "🚧 ROAD HAZARD DETECTED",
            body:
                "Possible road hazard detected. Slow down and drive carefully."
        };
    }

    return {
        title: "🚨 ACCIDENT DETECTED",
        body:
            "High magnitude impact detected. Please stop safely and check your surroundings."
    };
}

module.exports = {
    getSeverity,
    getAlertMessage
};
