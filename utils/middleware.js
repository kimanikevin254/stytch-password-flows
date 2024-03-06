const { getCookies } = require("./sessionManagement");

// Redirect unauthenticated users to the home page
function protectedRoute(req, res, next) {
    const { session_token, member_id } = getCookies(req, res);

    if (!session_token || !member_id) {
        return res.redirect("/");
    }

    next();
}

// Redirect authenticated users to the dashboard
function redirectIfAuthenticated(req, res, next) {
    const { session_token, member_id } = getCookies(req, res);

    if (session_token && member_id) {
        return res.redirect("/dashboard");
    }

    next();
}

module.exports = {
    protectedRoute,
    redirectIfAuthenticated,
};