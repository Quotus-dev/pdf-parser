FROM node:18-alpine

WORKDIR /app

COPY ["package.json", ".env", "./"]

RUN npm install

COPY . .

CMD ["npm", "run", "dev"]