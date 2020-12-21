import express from "express";
import gameFacade from "../facades/gameFacade";
const router = express.Router();
import { ApiError } from "../errors/apiError";

//import * as mongo from "mongodb"
import setup from "../config/setupDB";
import UserFacade from "../facades/userFacadeWithDB";

(async function setupDB() {
  const client = await setup();
  gameFacade.setDatabase(client);
})();

router.post("/nearbyplayers", async function (req, res, next) {
  try {
    const nearbyPlayers = await gameFacade.nearbyPlayers(
      req.body.userName,
      req.body.password,
      req.body.lon,
      req.body.lat,
      req.body.distance
    );
    res.send(nearbyPlayers);
  } catch (err) {
    next(err);
  }
});
router.post("/getPostIfReached", async function (req, res, next) {
  try {
    const result = await gameFacade.getPostIfReached(
      req.body.postId,
      req.body.lon,
      req.body.lat
    );
    res.send(result);
  } catch (err) {
    next(err);
  }
});
router.post("/updatePosition", async (req, res, next) => {
  try {
    const position = await gameFacade.updatePosition(
      req.body.userName,
      req.body.lon,
      req.body.lat
    );
    res.send(position);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
