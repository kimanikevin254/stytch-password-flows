const express = require("express");
const cookieParser = require("cookie-parser");
const { stytchClient } = require("./utils/stytchClient");
const {
    setSession,
    setMember,
    getCookies,
    revokeSession,
} = require("./utils/sessionManagement");
const {
    protectedRoute,
    redirectIfAuthenticated,
} = require("./utils/middleware");
require("dotenv").config();

const app = express();

app.use(cookieParser());

const port = 3000;

//Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

// Set view engine to EJS
app.set("view engine", "ejs");

// Show index page
app.get("/", redirectIfAuthenticated, (req, res) => {
    res.render("pages/index");
});

// Show signup form
app.get("/signup", redirectIfAuthenticated, (req, res) => {
    res.render("pages/signup");
});

// Verify the user's email address using EML
app.post("/password/verify-email", async (req, res) => {
    try {
        const {
            member: { email_address },
        } = await stytchClient.magicLinks.email.loginOrSignup({
            organization_id: process.env.STYTCH_ORG_ID,
            email_address: req.body.email,
        });

        res.send(
            `We have sent an email to ${email_address}. Please check your inbox.`
        );
    } catch (error) {
        console.log(error);
    }
});

// Authenticate the sign up EML
app.get("/authenticate", async (req, res) => {
    try {
        // Extract the `token` query param
        const token = req.query.token;

        if (!token) {
            return res.redirect("/");
        }

        // Authenticate token
        const { member, organization, session_token } =
            await stytchClient.magicLinks.authenticate({
                magic_links_token: token,
                session_duration_minutes: 1440,
            });

        // Set the necessary cookies
        setSession(req, res, session_token);
        setMember(req, res, member.member_id);

        // From the response returned above, the member object has a member_password_id -> Globally unique UUID that identifies a Member's password.
        // We can use this to determine if a member has a password
        // If the member does not have a password, prompt them to create one
        // This will help to avoid prompting members with a password to create one
        if (member.member_password_id === "") {
            // Reset password by session
            res.redirect(`/password/create`);
        } else {
            // Redirect to the dashboard
            res.redirect("/dashboard");
        }
    } catch (error) {
        console.log(error);
    }
});

// Show create password form
app.get("/password/create", protectedRoute, async (req, res) => {
    res.render("pages/reset-password/new-password");
});

// Create a user's password
app.post("/password/create", protectedRoute, async (req, res) => {
    try {
        // Extract the cookies
        const { session_token: sessionToken } = getCookies(req, res);

        // Extract the password and server password from the request body
        const { password, confirm_password } = req.body;

        // Make sure passwords match
        if (password !== confirm_password) {
            return res.render("pages/reset-password/new-password", {
                mismatch_error: "Passwords do not match",
            });
        }

        // Check the password strength
        const resp = await stytchClient.passwords.strengthCheck({
            password: confirm_password,
        });

        // Password does not pass the strength check
        if (resp.valid_password === false) {
            // Display the warnings and suggestions to the user
            // Prompt the user to choose a strong password

            // When the suggestions array and warning string are empty and the password is still not strong
            if (
                resp.zxcvbn_feedback.suggestions.length === 0 &&
                resp.zxcvbn_feedback.warning === ""
            ) {
                return res.render("pages/reset-password/new-password", {
                    strength_error: {
                        suggestions: [],
                        warning:
                            "Please add more characters to make the password stronger.",
                    },
                });
            }

            return res.render("pages/reset-password/new-password", {
                strength_error: resp.zxcvbn_feedback,
            });
        }

        // Password is valid
        // Create a password for the member via `Password reset by session`
        const { member, session_token } =
            await stytchClient.passwords.sessions.reset({
                organization_id: process.env.STYTCH_ORG_ID,
                password: confirm_password,
                session_token: sessionToken,
            });

        // Set the necessary cookies
        setSession(req, res, session_token);
        setMember(req, res, member.member_id);

        // Redirect to the dashboard
        res.redirect("/dashboard");
    } catch (error) {
        console.log(error);

        // Redirect to home if session is too old(older than 5 mins) to reset password
        if (error.error_type === "session_too_old_to_reset_password") {
            res.redirect("/");
        }
    }
});

// Show the dashboard
app.get("/dashboard", protectedRoute, async (req, res) => {
    try {
        // Extract member_id and organization_id from cookies
        const { member_id } = getCookies(req, res);

        // Retrieve member email
        const {
            member: { email_address },
        } = await stytchClient.organizations.members.get({
            organization_id: process.env.STYTCH_ORG_ID,
            member_id,
        });

        // Retrieve organization
        const {
            organization: { organization_name },
        } = await stytchClient.organizations.get({
            organization_id: process.env.STYTCH_ORG_ID,
        });

        res.render("pages/dashboard", {
            user: {
                email_address,
                organization_name,
            },
        });
    } catch (error) {
        console.log(error);
    }
});


// Display the password reset page
app.get("/password/reset", redirectIfAuthenticated, (req, res) => {
    res.render("pages/reset-password/index");
});

// Start password via email
app.post('/password/reset/email/start', async (req, res) => {
    try {
   	 // Extract member_id and organization_id from cookies
   	 const { email } = req.body

   	 // Initiate password reset
   	 await stytchClient.passwords.email.resetStart({
   		 organization_id: process.env.STYTCH_ORG_ID,
   		 email_address: email,
   		 reset_password_redirect_url: process.env.RESET_PASSWORD_REDIRECT_URL
   	 })

   	 // Display a message to the user informing them that we have sent an email address
   	 res.render('pages/reset-password/index', {
   		 email_sent_message: 'We have sent instructions on how to reset your password to the provided email address.'
   	 })

    } catch (error) {
   	 console.log(error)

   	 // Display a message to the user informing them that we have sent an email address even if the email address does not exist
   	 // Avoids providing too much info to an attacker
   	 res.render('pages/reset-password/index', {
   		 email_sent_message: 'We have sent instructions on how to reset your password to the provided email address.'
   	 })
    }
})

// Redirect URL for password reset via email
app.get("/password/reset/email", (req, res) => {
    try {
        // Extract password reset token from params
        const { token } = req.query;

        // Display the new password form
        res.render("pages/reset-password/email", {
            password_reset_token: token,
        });
    } catch (error) {
        console.log(error);
    }
});

// Reset the user's password
app.post("/password/reset/email", async (req, res) => {
    try {
        // Extract password_reset_token, password and confirm_password from the request body
        const { password_reset_token, password, confirm_password } = req.body;

        // Make sure the two passwords match
        if (password !== confirm_password) {
            return res.render("pages/reset-password/email", {
                mismatch_error: "Passwords do not match",
                password_reset_token,
            });
        }

        // Check the password strength
        const { valid_password, zxcvbn_feedback } =
            await stytchClient.passwords.strengthCheck({
                password: confirm_password,
            });

        // Password does not pass the strength check
        if (valid_password === false) {
            // Display the warnings and suggestions to the user
            // Prompt the user to choose a strong password
            return res.render("pages/reset-password/email", {
                strength_error: zxcvbn_feedback,
                password_reset_token,
            });
        }

        // Attempt to reset the password
        const { member, session_token } =
            await stytchClient.passwords.email.reset({
                password_reset_token,
                password: confirm_password,
            });

        // Set necessary cookies
        setSession(req, res, session_token);
        setMember(req, res, member.member_id);

        // show success message
        return res.render("pages/reset-password/email", {
            success_message: "Password reset successfully",
        });
    } catch (error) {
        console.log(error);
    }
});

// Password reset by existing password
app.get(
    "/password/reset/existing-password",
    protectedRoute,
    async (req, res) => {
        res.render("pages/reset-password/old-password");
    }
);

// Password reset by existing password
app.post(
    "/password/reset/existing-password",
    protectedRoute,
    async (req, res) => {
        try {
            // Extract organization_id and member_id from cookies
            const { member_id } = getCookies(req, res);

            // Extract old_password, new_password, and confirm_new_password from request body
            const { old_password, new_password, confirm_new_password } =
                req.body;

            // Make sure new_password and confirm_password match
            if (new_password !== confirm_new_password) {
                return res.render("pages/reset-password/index", {
                    mismatch_error: "Passwords do not match",
                });
            }

            // Check password strength
            const { valid_password, zxcvbn_feedback } =
                await stytchClient.passwords.strengthCheck({
                    password: confirm_new_password,
                });

            // Return errors if the password does not pass the strength check
            if (valid_password === false) {
                // Display the warnings and suggestions to the user
                // Prompt the user to choose a strong password
                return res.render("pages/reset-password/new-password", {
                    strength_error: zxcvbn_feedback,
                });
            }

            // Retrieve the member email address using member_id
            const {
                member: { email_address },
            } = await stytchClient.organizations.members.get({
                organization_id: process.env.STYTCH_ORG_ID,
                member_id,
            });

            // Attempt to reset password
            const { member, session_token } =
                await stytchClient.passwords.existingPassword.reset({
                    email_address,
                    existing_password: old_password,
                    new_password: confirm_new_password,
                    organization_id: process.env.STYTCH_ORG_ID,
                });

            // Set the necessary cookies
            setSession(req, res, session_token);
            setMember(req, res, member.member_id);

            // Show success message
            res.render("pages/reset-password/old-password", {
                success_message: "Password updated successfully",
            });
        } catch (error) {
            console.log(error);
            if (error.error_type === "unauthorized_credentials") {
                res.render("pages/reset-password/index", {
                    error_message: "Incorrect credentials",
                });
            }
        }
    }
);

// Show login form
app.get('/login', redirectIfAuthenticated, (req, res) => {
    res.render('pages/login')
})

// Allow the user to log in via email and password
app.post("/login", redirectIfAuthenticated, async (req, res) => {
    try {
        // Extract the email and password from req body
        const { email, password } = req.body;

        // Attempt to login
        const { member_id, session_jwt } =
            await stytchClient.passwords.authenticate({
                organization_id: process.env.STYTCH_ORG_ID,
                email_address: email,
                password,
            });

        // Set cookies
        setMember(req, res, member_id);
        setSession(req, res, session_jwt);

        // redirect to dashboard
        res.redirect("/dashboard");
    } catch (error) {
        console.log(error);

        if (
            error.error_type === "unauthorized_credentials" ||
            error.error_type === "email_not_found"
        ) {
            res.render("pages/login", {
                error: "Unauthorized credentials",
            });
        }
    }
});

// Log out the user
app.get("/logout", protectedRoute, (req, res) => {
    revokeSession(req, res, stytchClient);
    res.redirect("/");
});

app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
});