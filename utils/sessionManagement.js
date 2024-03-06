const SESSION_COOKIE = "session_token";
const MEMBER_COOKIE = "member_id";

const SESSION_DURATION_MINUTES = 1440;

function setSession(req, res, sessionToken) {
    res.cookie(SESSION_COOKIE, sessionToken, {
        maxAge: SESSION_DURATION_MINUTES * 60 * 1000, // 24hrs in ms
        httpOnly: true,
    });
}

function setMember(req, res, memberId) {
    res.cookie(MEMBER_COOKIE, memberId, {
        maxAge: SESSION_DURATION_MINUTES * 60 * 1000, // 24hrs in ms
        httpOnly: true,
    });
}

function getCookies(req, res) {
    const { session_token, member_id } = req.cookies;
    return {
        session_token,
        member_id,
    };
}

function revokeSession(req, res, stytchClient) {
    const sessionToken = req.cookies.session_token;
    if (!sessionToken) {
        return;
    }
    // Delete session cookies by setting maxAge to 0
    res.cookie(SESSION_COOKIE, "", { maxAge: 0 });
    res.cookie(MEMBER_COOKIE, "", { maxAge: 0 });
    // Call Stytch in the background to terminate the session
    // But don't block on it!
    stytchClient.sessions
        .revoke({ session_token: sessionToken })
        .then(() => {
            console.log("Session successfully revoked");
        })
        .catch((err) => {
            console.error("Could not revoke session", err);
        });
}

module.exports = {
    setSession,
    setMember,
    getCookies,
    revokeSession,
};