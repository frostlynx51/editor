# Deployment Guide

## Official Live Demo

**No setup required** - The app is already deployed and ready to use:

🌐 **[https://frostlynx51.github.io/editor/](https://frostlynx51.github.io/editor/)**

Simply visit the URL and configure with your GitHub token and repository.

---

## Forking & Deploying Your Own Version

If you've forked this repository and want your own deployment:

### 1. Update Base Path

Edit `vite.config.js` line 6 to match your repository name:

```js
base: '/your-repo-name/',  // Change 'editor' to your repo name
```

### 2. Commit Lock File

```bash
npm install
git add package-lock.json .gitignore
git commit -m "Add package-lock.json"
git push origin main
```

### 3. Enable GitHub Pages

1. Go to your repository on GitHub
2. **Settings** → **Pages** (left sidebar)
3. Under "Build and deployment":
   - **Source**: Select **GitHub Actions**
4. Save

### 4. Wait for Deployment

- Go to **Actions** tab
- Watch "Deploy to GitHub Pages" workflow
- Takes 1-2 minutes
- Your app will be at: `https://[username].github.io/[repo-name]/`

### 5. Test

Visit your URL and verify:
- App loads correctly
- Can connect to GitHub repositories
- Save functionality works

### Troubleshooting

**404 errors after deployment:**
- Check `base` path in `vite.config.js` matches repo name exactly
- Verify GitHub Pages source is set to "GitHub Actions"

**Workflow fails:**
- Ensure `package-lock.json` is committed to repository
- Check Actions tab for error details

**Assets not loading:**
- `base` path must include slashes: `'/repo-name/'`
- Hard refresh browser: `Ctrl+Shift+R` or `Cmd+Shift+R`

---

## Self-Hosting

To host on your own server or CDN:

### Build

```bash
npm install
npm run build
```

This creates a `dist/` folder with production-ready files.

### Deploy

**Option A: Static file server**

Copy `dist/` contents to your web server:

```bash
# Example: Copy to Apache/Nginx
cp -r dist/* /var/www/html/

# Or upload via FTP/SFTP to your hosting provider
```

**Option B: Node.js server**

```bash
npm install -g serve
serve -s dist -p 3000
```

Open `http://localhost:3000`

**Option C: Docker**

```dockerfile
FROM nginx:alpine
COPY dist/ /usr/share/nginx/html/
EXPOSE 80
```

```bash
docker build -t editor .
docker run -p 8080:80 editor
```

### Configuration

**Root path deployment:**

If hosting at domain root (e.g., `https://editor.example.com/`):

```js
// vite.config.js
base: '/',
```

**Subdirectory deployment:**

If hosting in subdirectory (e.g., `https://example.com/editor/`):

```js
// vite.config.js
base: '/editor/',
```

### Testing Locally

Before deploying:

```bash
npm run preview
```

Open `http://localhost:4173` to test the production build.

### Requirements

**Server requirements:**
- Static file hosting (HTML/CSS/JS)
- HTTPS recommended (required for service workers)
- No backend/database needed

**Client requirements:**
- Users need GitHub personal access tokens
- Users need Gemini API keys (for AI features)
- All API calls are client-side only

### Notes

- All user data stored in browser localStorage
- No server-side configuration needed
- Works with any static hosting provider (Netlify, Vercel, Cloudflare Pages, etc.)
