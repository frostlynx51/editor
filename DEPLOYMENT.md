# Deployment Guide

## GitHub Pages Deployment (Automated)

This project is configured to automatically deploy to GitHub Pages when you push to the `main` branch.

### Initial Setup (One-Time)

1. **Enable GitHub Pages**
   - Go to your repository on GitHub
   - Click **Settings** → **Pages** (in the left sidebar)
   - Under "Build and deployment":
     - Source: Select **GitHub Actions**
   - Save (if prompted)

2. **Push your code**
   ```bash
   git add .
   git commit -m "Setup GitHub Pages deployment"
   git push origin main
   ```

3. **Wait for deployment**
   - Go to **Actions** tab in your repository
   - Watch the "Deploy to GitHub Pages" workflow run
   - Takes ~1-2 minutes

4. **Access your app**
   - Your app will be live at: `https://<username>.github.io/<repo-name>/`
   - Example: `https://frostlynx.github.io/editor/`
   - The URL is shown in Settings → Pages after deployment

### How It Works

The GitHub Action (`.github/workflows/deploy.yml`) automatically:
1. Triggers on every push to `main` branch
2. Installs dependencies with `npm ci`
3. Builds the app with `npm run build`
4. Deploys the `dist/` folder to GitHub Pages

### Repository Name Change

If you rename your repository, update the `base` path in `vite.config.js`:

```js
export default defineConfig({
  base: '/new-repo-name/',  // Change this to match
  // ...
})
```

### Custom Domain (Optional)

To use a custom domain like `editor.yourdomain.com`:

1. **Add DNS records** (in your domain registrar):
   ```
   Type: CNAME
   Name: editor
   Value: <username>.github.io
   ```

2. **Configure in GitHub**:
   - Settings → Pages → Custom domain
   - Enter: `editor.yourdomain.com`
   - Check "Enforce HTTPS"

3. **Update vite.config.js**:
   ```js
   base: '/',  // Use root path for custom domain
   ```

### Manual Deployment (Alternative)

If you prefer manual deploys:

```bash
# Build the app
npm run build

# Deploy (requires gh-pages package)
npm install -D gh-pages
npx gh-pages -d dist
```

### Testing Production Build Locally

Before deploying, test the production build:

```bash
npm run build
npm run preview
```

Open `http://localhost:4173` to test.

### Troubleshooting

#### Deployment fails with "Permission denied"

**Fix:** Update workflow permissions in `.github/workflows/deploy.yml`:
```yaml
permissions:
  contents: read
  pages: write
  id-token: write
```

These are already set in the provided workflow.

#### 404 error after deployment

**Possible causes:**
1. GitHub Pages not enabled (see Initial Setup step 1)
2. Wrong `base` path in `vite.config.js` (must match repo name)
3. Workflow didn't complete successfully (check Actions tab)

**Fix:**
- Verify Settings → Pages shows "Your site is live at..."
- Check that `base: '/repo-name/'` matches your repository name
- Review workflow logs in Actions tab for errors

#### CSS/JS files not loading (404)

**Cause:** Incorrect base path in `vite.config.js`

**Fix:** Ensure `base` matches your repository name exactly:
```js
// If repo is https://github.com/user/my-editor
base: '/my-editor/'  // Must include slashes
```

#### Changes not showing up

**Possible causes:**
1. Workflow didn't run (check Actions tab)
2. Browser cache

**Fix:**
- Check Actions tab for recent workflow run
- Hard refresh: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
- Clear browser cache
- Try incognito/private window

#### Rate limiting issues

GitHub Pages serves static files, but your app calls GitHub API directly:
- Unauthenticated: 60 requests/hour per IP
- Authenticated: 5,000 requests/hour per token
- Your app uses personal access tokens, so each user gets 5,000 req/hour

**Not a deployment issue** - this affects all users regardless of hosting.

### Development vs Production

**Development (npm run dev):**
- Runs on `http://localhost:5173`
- Hot module reloading
- Source maps enabled
- Custom proxy in vite.config.js (currently unused)

**Production (GitHub Pages):**
- Runs on `https://<username>.github.io/<repo>/`
- Static files only
- Minified and optimized
- Direct GitHub API calls (no proxy)

### Environment Variables

This app doesn't use build-time environment variables. All configuration (GitHub tokens, API keys) is stored in browser localStorage.

**Security note:** These are stored client-side and visible to anyone inspecting the page. Only use personal access tokens with minimal permissions (read/write to specific repositories).

### Deployment Checklist

Before your first deployment:

```
□ Create GitHub Actions workflow (.github/workflows/deploy.yml)
□ Update vite.config.js with correct base path
□ Test locally with npm run preview
□ Push to GitHub
□ Enable GitHub Pages in repository settings (Source: GitHub Actions)
□ Wait for workflow to complete
□ Visit your GitHub Pages URL
□ Test all functionality (load files, save, daily notes, AI chat)
□ Update README.md with live demo link
```

### Monitoring

After deployment:
- **Actions tab**: View workflow runs and logs
- **Environments**: Settings → Environments → github-pages shows deployment history
- **Pages**: Settings → Pages shows current status and URL

### Rolling Back

To revert to a previous version:

1. Go to **Actions** tab
2. Find the previous successful workflow run
3. Click "Re-run all jobs"

Or revert the commit and push:
```bash
git revert <commit-hash>
git push origin main
```

### Cost

GitHub Pages is **free** for public repositories:
- 1 GB storage limit
- 100 GB bandwidth/month
- Unlimited builds

For private repositories:
- Free with GitHub Pro/Team/Enterprise
- Or $4/month with GitHub Pro

### Next Steps

After successful deployment:
1. ✅ Add live demo link to README.md
2. ✅ Share with users
3. ✅ Monitor Actions tab for deployment issues
4. ✅ Test on different devices/browsers
5. ✅ Consider adding custom domain

### Support

If you encounter issues:
1. Check **Actions** tab for workflow errors
2. Review **Settings → Pages** for configuration issues
3. Inspect browser console for JavaScript errors
4. Check GitHub Status: https://www.githubstatus.com/

---

**Pro Tip:** Every push to `main` triggers a new deployment. Use feature branches and pull requests to test changes before deploying.
