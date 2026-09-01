# F1 Telemetry Stream

ok can you acces my github https://github.com/paulsergiupopescu-afk/f1-telemetry-hub?

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/2b208021-e5a7-4025-8ba4-8bd72df71efc).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Desktop app (Windows .exe + installer wizard)

Run these on a Windows PC with Node 20+ installed:

```bash
npm install
npm run desktop:start      # build + run the desktop app locally
npm run desktop:installer  # builds release/F1-Telemetry-Hub-Setup-1.0.0.exe (NSIS wizard)
```

The wizard lets you choose the install folder and creates desktop + start-menu
shortcuts. The desktop app opens UDP port 20777 itself, so in-game you only set
Settings -> Telemetry -> UDP Telemetry: On, IP 127.0.0.1, Port 20777, Rate 60Hz.

For the web version, run `npm run bridge` on the gaming PC and press Connect in
the Telemetry Source panel.

Note: the installer must be produced on Windows (or Linux with Wine) — this
sandbox has no Wine, so only the unpacked build can be produced here.
