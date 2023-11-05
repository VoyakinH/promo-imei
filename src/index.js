const express = require('express');
const api = require('./api');

require('dotenv').config();

const app = express();
const port = process.env.PORT;

app.use('/api', api);

app.listen(port, () => {
    console.log(`Running on port ${port}`);
})