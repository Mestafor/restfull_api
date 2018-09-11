# restfull_api

# Instalation
npm install

# Generate certificate
openssl req -newKey rsa:2048 -new -nodes -x509 -days 3650 -keyoutkey.pem -out cert.pem

# Run server
node index.js || npm start