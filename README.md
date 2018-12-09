# restfull_api

# Instalation
npm install

# Generate certificate
openssl req -newkey rsa:2048 -nodes -keyout key.pem -x509 -days 365 -out cert.pem

# Run server
node index.js || npm start