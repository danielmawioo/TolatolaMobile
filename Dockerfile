# Runs the Expo web build in a container. Note: this is a convenience wrapper for
# the web target only — Android/iOS builds require native tooling (Xcode/Android
# Studio) that cannot run in a Linux container, so this does not replace `npx expo
# start` on your machine for mobile development.
FROM node:20-bullseye

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

EXPOSE 8081 19000 19006

CMD ["npx", "expo", "start", "--web", "--host", "lan"]
