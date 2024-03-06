const stytch = require("stytch");
const undici = require("undici");
require("dotenv").config();

const dispatcher = new undici.Agent({
    // Enable HTTPS Keep-Alive to avoid the cost of establishing a new connection with the Stytch servers on every request
    keepAliveTimeout: 6e6, // 10 minutes in MS
    keepAliveMaxTimeout: 6e6, // 10 minutes in MS

    // Set the timeout to 60s. Default is 10s
    connect: {
        timeout: 60000,
    },
});

const stytchClient = new stytch.B2BClient({
    project_id: process.env.STYTCH_PROJECT_ID,
    secret: process.env.STYTCH_PROJECT_SECRET,
    dispatcher,
});

module.exports = { stytchClient };