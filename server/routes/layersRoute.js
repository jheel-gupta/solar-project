const express = require("express");

const { getLayers} = require("../controllers/layersController");

const router = express.Router();

router.get("/",getLayers);
module.exports = router;