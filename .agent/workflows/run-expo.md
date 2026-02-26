---
description: How to run the TolatolaMobile app locally using Expo
---

1.  **Open a terminal** in the project root: `/Users/danielmawioo/TolaTola/TolatolaMobile`
2.  **Ensure dependencies are installed**:
    ```bash
    npm install
    ```
3.  **Start the Expo server**:
    ```bash
    npm start
    ```
4.  **Open the app**:
    -   **On a physical device** (Recommended): Install **Expo Go** on your phone. Scan the QR code in the terminal.
    -   **On an iOS Simulator**: Press `i`. 
        -   *Note*: If you see "This app is not made for this device", ensure you have an **iOS** runtime installed in Xcode (not just tvOS/watchOS).
    -   **On an Android Emulator**: Press `a`.

### Troubleshooting
-   **Missing iOS Runtime**: Open Xcode > Settings > Platforms and ensure "iOS" is installed.
-   **Node Version**: If you see `EBADENGINE`, ensure you are on Node `v20.19.4+` (use `nvm install 20`).
