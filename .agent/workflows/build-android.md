---
description: How to create a .aab for Android using EAS Build
---

1.  **Install EAS CLI** (if not already installed):
    ```bash
    npm install -g eas-cli
    ```
2.  **Login to your Expo account**:
    ```bash
    eas login
    ```
3.  **Run the production build for Android**:
    ```bash
    eas build -p android --profile production
    ```
4.  **Follow the terminal prompts**:
    -   If asked to generate a keystore, select **Yes**.
    -   EAS will start the build in the cloud. You can track the progress via the provided URL.
5.  **Download the .aab**:
    -   Once the build is finished, download the `.aab` file from the final link or the Expo dashboard.
