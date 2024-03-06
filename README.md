# Secure Password Reset and Creation Flows with Node.js and Stytch

## Prerequisites

-   A Pro [Stytch B2B](https://stytch.com/pricing?type=B2B) account
-   An email address that does not have a [common domain](https://stytch.com/docs/b2b/api/common-email-domains)
-   [Node.js v18.18.2](https://nodejs.org/en) installed on your local machine
-   A code editor and a web browser

## Configuring your Stytch Account

1. Once you sign up for a Stytch account, you will be redirected to the [dashboard](https://stytch.com/dashboard/home?env=test). Select your current project dropdown on the top navigation bar and click **Create new project**.

    ![Creating a new project](https://i.imgur.com/dJiJ9LM.png)

2. On the **Create new project** modal, provide a project name, select **B2B SAAS AUTHENTICATION** as the "Authentication type", and click **Create project**.

    ![Providing new project details](https://i.imgur.com/xdfThnW.png)

3. Create an organization by selecting **Organization** from the sidebar and click **Create new organization** on the resulting page.

    ![Creating a new organization](https://i.imgur.com/ICessrP.png)

4. On the **New Org** page, provide "My First Org" as the **Name** and "my-first-org" as the **Slug**. Scroll down and under **Who can join via JIT provisioning?**, select "Users from allowed domains". Lastly, under **Allowed domains**, click **Add new** and provide your email's domain.

    ![Providing new org details](https://i.imgur.com/N4tkyMg.png)

    Save the changes and take note of your **Organization ID**.

5. Create a URL where your users will be redirected when they click the email reset magic link. To do this, select **Redirect URLs** from the sidebar, delete the already existing redirect URL, and click **Create new redirect URL**

    ![Redirect URLs page](https://i.imgur.com/4adfUh5.png)

    On the **Create new redirect URL** modal, provide "http://localhost:3000/password/reset/email" as the **URL**, select "Reset password" as the **Type**, toggle the **Set as default** button, and click **Ok**.

    ![Providing the redirect URL details](https://i.imgur.com/ShgqyQm.png)

    Repeat the process above to create another redirect URL and provide "http://localhost:3000/authenticate" as the **URL**, select "Login" and "Sign up" as the **Type**, make sure the **Set as default** checkbox is selected, and click **click Ok**. This redirect URL will be used for authenticating login and sign-up requests made via magic links.

    ![Providing the redirect URL details](https://i.imgur.com/xIMF2nT.png)

6. Navigate to the **API Keys** page on the Stytch dashboard and take note of your Project ID and Secret.

    ![API Keys](https://i.imgur.com/oiY4AZj.png)

## Running the Project Locally

1. Clone the project.

    ```bash
    git clone https://github.com/kimanikevin254/stytch-password-flows.git
    ```

2. Rename `.env.example` to `.env`.

    ```bash
    mv .env.example .env
    ```

3. Replace the placeholder values in the `.env` file with the corresponding values you obtained in the previous section.

4. Run the server and navigate to `http://localhost:3000`.

    ```bash
    node server.js
    ```
