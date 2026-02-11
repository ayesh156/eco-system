# Render Auto-Deploy Setup Guide

## ✅ render.yaml Configuration Updated

I've updated your `render.yaml` file with the following changes to enable auto-deploy:

### Changes Made:
1. **Added `branch: master`** - Specifies which branch to track for auto-deploy
2. **Added `autoDeploy: true`** - Enables automatic deployments on push

Both backend and frontend services now have these settings.

---

## 🔧 Render Dashboard Configuration Required

The `render.yaml` changes are not enough alone. You **MUST** configure auto-deploy in your Render dashboard:

### Step-by-Step Instructions:

#### 1. **Connect GitHub Repository**
   - Go to [Render Dashboard](https://dashboard.render.com/)
   - Click on your **eco-system-api** service
   - Go to **Settings** tab
   - Scroll to **Build & Deploy** section
   - Ensure the **GitHub Repository** is connected:
     - Repository: `ayesh156/eco-system`
     - Branch: `master`

#### 2. **Enable Auto-Deploy**
   - In the same **Build & Deploy** section
   - Find **Auto-Deploy** setting
   - **Enable** the toggle switch
   - This tells Render to automatically deploy when you push to `master` branch

#### 3. **Repeat for Frontend**
   - Click on your **eco-system-frontend** service
   - Follow the same steps above
   - Enable Auto-Deploy for frontend as well

#### 4. **Verify GitHub Integration**
   - Go to your [GitHub Settings](https://github.com/settings/installations)
   - Find **Render** in your installed GitHub Apps
   - Ensure `eco-system` repository is granted access
   - If not, click **Configure** and enable access for this repo

---

## 🔍 Troubleshooting Auto-Deploy Issues

If auto-deploy still doesn't work after the above steps:

### Issue 1: GitHub Repository Not Connected
**Symptoms:** Render doesn't detect new pushes

**Solution:**
- In Render dashboard → Service Settings → GitHub
- Click "Disconnect" then "Reconnect" repository
- Re-authorize Render on GitHub

### Issue 2: Auto-Deploy Toggle Disabled
**Symptoms:** Can't turn on auto-deploy toggle

**Solution:**
- Check if you're on the **Free Plan** (free plans support auto-deploy)
- Ensure the GitHub connection is healthy (green checkmark)
- Try unlinking and relinking the repository

### Issue 3: Branch Name Mismatch
**Symptoms:** Pushes to `master` don't trigger deploy, but manual deploys work

**Solution:**
- Verify your default branch is `master` (not `main`)
- In Render Settings, ensure **Branch** field says `master`
- If your branch is `main`, update `render.yaml`:
  ```yaml
  branch: main  # Change from master to main
  ```

### Issue 4: Build Failing on Auto-Deploy
**Symptoms:** Auto-deploy triggers but build fails

**Solution:**
- Check Render build logs for errors
- Ensure all environment variables are set in Render dashboard
- Test build locally: 
  ```bash
  cd backend
  npm install --include=dev && npx prisma generate && npx tsc
  
  cd ../frontend
  npm install && npm run build
  ```

### Issue 5: GitHub Webhook Not Delivered
**Symptoms:** No deploy triggered, even though auto-deploy is enabled

**Solution:**
- Go to your GitHub repo: `https://github.com/ayesh156/eco-system/settings/hooks`
- Find the Render webhook
- Click "Edit" → "Recent Deliveries" tab
- Check if webhook deliveries are failing
- If failing, click "Redeliver" to test
- If needed, delete and re-add the webhook by reconnecting repo in Render

---

## 📝 Expected Auto-Deploy Workflow

Once configured correctly, this is what should happen:

1. You make changes locally and commit:
   ```bash
   git add .
   git commit -m "Your changes"
   ```

2. You push to GitHub:
   ```bash
   git push origin master
   ```

3. **GitHub sends webhook to Render** (instant)

4. **Render receives webhook and starts build** (within 30 seconds)
   - Backend: Runs `npm install && prisma generate && tsc`
   - Frontend: Runs `npm install && npm run build`

5. **If build succeeds, Render deploys automatically** (3-5 minutes total)

6. **Your live site updates** 🎉

---

## 🔔 Enable Deploy Notifications

To get notified when deploys succeed/fail:

1. Go to Render Dashboard → Service Settings
2. Scroll to **Notifications** section
3. Add your email address
4. Select notification types:
   - ✅ Deploy Started
   - ✅ Deploy Succeeded
   - ✅ Deploy Failed

---

## ⚡ Quick Test

After configuring auto-deploy, test it:

1. Make a small change (e.g., update a comment in code)
2. Commit and push:
   ```bash
   git add .
   git commit -m "Test auto-deploy"
   git push origin master
   ```
3. Check Render dashboard - you should see a new deploy start within 30 seconds
4. Check the "Events" tab in Render dashboard to see deploy history

---

## 📞 Still Not Working?

If you've followed all steps and auto-deploy still doesn't work:

1. **Check Render Status Page:** https://status.render.com/
   - Ensure Render services are operational

2. **Contact Render Support:**
   - Dashboard → Help & Support
   - Include:
     - Service name: `eco-system-api` / `eco-system-frontend`
     - Repository: `ayesh156/eco-system`
     - Issue: "Auto-deploy not triggering on GitHub push"

3. **Try Manual Sync:**
   - As a workaround, use Render's manual deploy button after each push
   - Or use Render API/CLI to trigger deploys via GitHub Actions

---

**✨ After completing these steps, push this updated `render.yaml` to GitHub and it should trigger your first auto-deploy!**
