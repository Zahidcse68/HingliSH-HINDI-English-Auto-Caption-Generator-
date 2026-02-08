# DesiCut AI - Deployment Guide

This app is ready to be published to **Vercel**. 

### ⚠️ Important Security Note
**Please DO NOT share your login credentials with anyone, including AIs.** You can deploy this yourself securely in 3 simple steps.

## How to Deploy (The Secure Way)

1.  **Push to GitHub**:
    *   Create a new repository on [GitHub](https://github.com/new).
    *   Upload all the files in this directory to that repository.

2.  **Connect to Vercel**:
    *   Go to [vercel.com](https://vercel.com) and log in.
    *   Click **"Add New"** > **"Project"**.
    *   Select your GitHub repository from the list.

3.  **Set Environment Variables**:
    *   In the Vercel "Configure Project" screen, look for the **Environment Variables** section.
    *   Add a new key: `API_KEY`.
    *   Value: Your Gemini API Key from [Google AI Studio](https://aistudio.google.com/app/apikey).
    *   Click **"Deploy"**.

## Build Settings
Vercel will automatically detect these, but for reference:
- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`

Your app will be live at a custom URL provided by Vercel!
