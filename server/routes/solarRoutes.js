const express = require("express");
const router = express.Router();

const { getSolarData } = require("../controllers/solarController");

router.get("/", getSolarData);

module.exports = router;