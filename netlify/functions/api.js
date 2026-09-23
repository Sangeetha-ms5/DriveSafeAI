const serverless = require("serverless-http");
const app = require("../../road-safety-backend/server");

const expressHandler = serverless(app);

module.exports.handler = function handler(event, context) {
	const functionPrefix = "/.netlify/functions/api";

	if (event.path && event.path.startsWith(functionPrefix)) {
		event.path = event.path.slice(functionPrefix.length) || "/";
	}

	return expressHandler(event, context);
};
