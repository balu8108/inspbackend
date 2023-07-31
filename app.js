const express = require("express");
const app = express();
//const bodyParser = require('body-parser');
const cookieParser = require("cookie-parser");
const cors = require("cors");

app.use(express.json());
app.use(cors());

app.use(cookieParser());

module.exports = app;
