# ابدأ من صورة Node.js النحيفة
FROM node:20-slim

# قم بتثبيت اعتماديات Playwright فقط
RUN apt-get update && apt-get install -y libgbm-dev libnss3 libasound2 libatk-bridge2.0-0 libgtk-3-0

WORKDIR /app

COPY package*.json ./
# قم بتثبيت اعتماديات الإنتاج فقط
RUN npm install --omit=dev

COPY . .

# قم بتثبيت متصفح Chromium فقط
RUN npx playwright install --with-deps chromium


ENV PORT=10000
EXPOSE 10000

# قم بتشغيل الخادم البسيط
CMD ["node", "server.js"]
