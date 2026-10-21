# Deploy guide

This puts IDK.org on the internet for free. The web app and the API run together as one Vercel project, and the database is on MongoDB Atlas. It takes about 20 minutes. Do the parts in order and keep a notes file open, because you will copy two values between sites.

The two values you need:

- `MONGODB_URI`: the database connection string (part 1)
- `JWT_SECRET`: a long random secret (part 2)

A note on the free plan: Vercel's free "Hobby" plan is meant for personal, non-commercial projects. It is fine for building and testing. Once the app earns money, move to a paid plan or another host.

## Part 1: the database (MongoDB Atlas)

If you already did this, check that your notes have the final connection string and that Network Access allows `0.0.0.0/0`. Vercel does not have a fixed address, so Atlas has to accept connections from anywhere.

1. Go to mongodb.com/atlas and sign up (the Google button is fine).
2. Create a cluster and choose the **M0 Free** option. Click Create.
3. When it asks you to set up a database user, enter a username such as `idkapi` and a password. Use only letters and numbers in the password. Write both down.
4. Open **Network Access** in the left menu, click **Add IP Address**, choose **Allow access from anywhere** (it fills in `0.0.0.0/0`) and confirm. You should see `0.0.0.0/0` with the status Active.
5. Go back to your cluster, click **Connect**, then **Drivers**, and copy the connection string. It looks like:
   `mongodb+srv://idkapi:<db_password>@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`
6. Edit the copy in your notes:
   - Replace `<db_password>` with your real password. Remove the `<` and `>` too.
   - Add `/idk-org` right after `.mongodb.net`, before the `?`.
   It should now look like:
   `mongodb+srv://idkapi:YourPassword123@cluster0.abcde.mongodb.net/idk-org?retryWrites=true&w=majority&appName=Cluster0`
   This is your `MONGODB_URI`. Keep it private. Anyone with it can read your database.

## Part 2: make a secret

On any computer with Node.js, run this and copy the long text it prints:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

That is your `JWT_SECRET`. Keep it private too. If you do not have Node.js handy, any random string of 40 or more letters and numbers works.

## Part 3: the website and API (Vercel)

1. Go to vercel.com and sign up with your GitHub account. Choose the free Hobby plan.
2. Click **Add New**, then **Project**. Find the `IDK-org` repository and click **Import**. If Vercel asks for permission to see your repositories, allow it for `IDK-org` only.
3. On the settings page, set **Framework Preset** to **Other**. Leave the build and install commands as they are. The output directory should show `docs` (it comes from `vercel.json`).
4. Open **Environment Variables** and add these three, one at a time (name, then value, then Add):
   - `MONGODB_URI`: the string from part 1
   - `JWT_SECRET`: the secret from part 2
   - `NODE_ENV`: `production`
5. Click **Deploy** and wait one or two minutes. You should see a "Congratulations" page with a preview of the site.
6. Open your site address (it ends in `.vercel.app`) and add `/health` at the end. You should see something like `{"status":"healthy", ...}`.

If you add or change an environment variable after the first deploy, redeploy for it to take effect: open **Deployments**, click the three dots on the latest one, and choose **Redeploy**.

## Part 4: check that everything works

Open your `.vercel.app` address on your phone or computer.

1. Register a new account. You should land on the quiz.
2. Answer the 10 questions. You should see your result.
3. Tap **Chat with the study coach** and send a message. You should get a reply with tips.
4. Open **Menu**, log out, and log in again. You should go straight to the coach.

If something is wrong:

| What you see | Likely cause |
| --- | --- |
| "The database is not reachable right now" | `MONGODB_URI` is wrong, or Atlas Network Access does not allow `0.0.0.0/0`. Fix it, then redeploy. |
| The `/health` page shows an error | A required variable is missing. Check that `JWT_SECRET` is set, then redeploy. Open your project's **Logs** tab on Vercel to see the exact message. |
| The first request is slow | Normal. A function that has not been used for a while needs a moment to start. |

## Good to know

- The web app and the API share one address, so there is no extra setup to connect them.
- The built-in rate limits count requests per running function instance. They work, but they are not a strict global limit. A shared store for rate limits is on the to-do list.
- Free hosting can change its rules. Check the current limits on vercel.com/pricing before you rely on it.

## Later: the Android app

The Android app needs a file called `assetlinks.json` at `/.well-known/assetlinks.json` on the same address. Put it in `docs/.well-known/` and it will be served from the top of your `.vercel.app` address. Nothing above needs to change before then.
