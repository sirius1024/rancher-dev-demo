FROM node:alpine
WORKDIR /app
COPY package.json .
RUN npm i --registry https://registry.npm.taobao.org
COPY . .
CMD [ "node", "bin/www" ]