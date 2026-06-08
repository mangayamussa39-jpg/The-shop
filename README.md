# How to build the APK

## What to add to your repo

Copy the `android/` folder and `.github/` folder into your repo root.

Your repo should look like this:

```
The-shop/
├── .github/
│   └── workflows/
│       └── build.yml
├── android/
│   ├── build.gradle
│   ├── settings.gradle
│   ├── gradle/wrapper/gradle-wrapper.properties
│   └── app/
│       ├── build.gradle
│       └── src/main/
│           ├── AndroidManifest.xml
│           ├── java/com/itcabinet/app/MainActivity.java
│           ├── res/values/themes.xml
│           └── assets/          ← PUT YOUR HTML FILES HERE
│               ├── index.html
│               ├── shop.html
│               ├── about.html
│               ├── contact.html
│               ├── screen.js
│               ├── sw.js
│               └── register-sw.js
├── index.html
├── shop.html
└── ... (your existing files)
```

## IMPORTANT — Copy your HTML into assets

You must copy your HTML files into:
`android/app/src/main/assets/`

These are the files the APK will use. They are bundled inside the app.

## How to get the APK

1. Push everything to GitHub
2. Go to your repo → Actions tab
3. Wait ~5 minutes for the build to finish
4. Click the finished workflow → scroll down to Artifacts
5. Download `App-debug.zip` → extract → you have your APK

## Install on phone

1. Enable "Install from unknown sources" in phone settings
2. Open the APK file
3. Install

Done. The app works fully offline, no internet needed, no subscription, no expiry.
