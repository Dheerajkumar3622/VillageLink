---
description: Run app in Android emulator with live reload and full database connectivity
---

# Live Development with Emulator

This workflow lets you see instant code changes in an Android emulator while connected to your real backend/database.

## Prerequisites
- Android SDK installed
- Android emulator running (or physical device connected via USB)
- Backend deployed on Render (or running locally)

## Steps

// turbo
1. **Sync Capacitor** (run once after code changes to native files):
```bash
npm run cap:sync
```

// turbo
2. **Start the live development server**:
```bash
npm run dev:live
```
> This starts Vite on `0.0.0.0:3000` so the emulator can access it.

3. **In a new terminal, run on Android** with live reload:
```bash
npm run cap:live
```

## How It Works

| What | Where |
|------|-------|
| Frontend (UI) | Your local machine → hot reloads in emulator |
| Backend/API | Render (`villagelink-jh20.onrender.com`) |
| Database | MongoDB Atlas (via Render backend) |

## Switching to Production Mode

To build for production (no live reload):

1. Edit `capacitor.config.ts`:
   - Comment out: `url: 'http://10.0.2.2:3000'`
   - Uncomment: `url: 'https://villagelink-jh20.onrender.com'`

2. Build and sync:
```bash
npm run build
npm run cap:sync
```

## Troubleshooting

- **Emulator can't connect**: Ensure `10.0.2.2:3000` is set in `capacitor.config.ts`
- **API errors**: Check Render dashboard for backend status
- **Changes not updating**: Stop and restart `npm run cap:live`
