# MapCRM — Location-Intelligent Relationship Management

Welcome to **MapCRM**! This repository is configured to be fully out-of-the-box compatible with Vercel for zero-config deployments.

---

## 📖 Brochure: Why Choose MapCRM?

MapCRM is the ultimate relationship and location intelligence tool designed for modern communities, neighborhood organizers, and active networks. It bridges the gap between contact management and physical geography, letting you visualize where your connections live, meet, and interact.

By placing your contacts directly onto an interactive, beautiful map, MapCRM transforms flat spreadsheets into actionable spatial insights. Easily identify spatial clusters of your community, plan regional get-togethers, and coordinate targeted localization initiatives. Track comprehensive histories of physical and digital interactions, keep records updated, and never lose touch with your local members. Built on secure Firestore architecture, your data stays synchronized in real-time, completely secure, and accessible from any device. MapCRM empowers you to build stronger, more organized, and physically connected relationships.

---

## 🌟 Key Functionalities

- **📍 Spatial Contact Mapping**: Plot your contacts and addresses on a interactive map. Zoom in on neighborhood clusters to organize localized actions.
- **👥 Household & Relation Management**: Easily manage residents living at the same address, link relationships between contacts, and filter by affiliation categories.
- **📅 Chronological Events & Interactions**: Log group events like neighborhood gatherings, online calls, or physical meetups. Easily modify titles, dates, attendees, or notes.
- **🔒 Secure Authentication & Real-Time Sync**: Integrates securely with Google Cloud Firestore and Firebase Auth, offering private sandboxed databases per user.
- **🌓 Adaptive Theme Modes**: Seamlessly toggle between dark slate interfaces for eye-safe evening planning and modern light aesthetics.

---

## 🚀 How to Deploy on Vercel (Step-by-Step)

Deploying MapCRM on Vercel is extremely straightforward. Since we have configured `package.json`, `tsconfig.json`, `vite.config.ts`, and a native `vercel.json` rewrite handler, follow these simple steps:

### Step 1: Upload to GitHub
Initialize Git, commit your files, and push them to a private or public repository on GitHub:
```bash
git init
git add .
git commit -m "feat: ready for Vercel deployment"
# Link to your GitHub repository and push
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

### Step 2: Import into Vercel
1. Go to [Vercel.com](https://vercel.com) and log in.
2. Click **Add New** and select **Project**.
3. Import your GitHub repository.

### Step 3: Configure Build & Deploy
Vercel automatically detects **Vite** as the framework framework. The settings should be auto-populated:
- **Framework Preset**: `Vite` (automatically detected)
- **Root Directory**: `./` (leave default)
- **Build Command**: `npm run build` or `vite build`
- **Output Directory**: `dist`

Click **Deploy**! Your application will be live in less than a minute with fully functioning routing, real-time database, and map visuals.
