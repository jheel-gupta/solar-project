const express = require("express");

const { getFlux } = require( "../controllers/fluxController" );

const router = express.Router();

router.get("/", getFlux);

module.exports = router;