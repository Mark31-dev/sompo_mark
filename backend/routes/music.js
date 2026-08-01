import { Router } from "express";

import * as controller from "../controllers/musicController.js";

const router = Router();

router.get("/genres", controller.genres);
router.get("/tracks", controller.tracks);
router.get("/underground", controller.underground);
router.get("/tracks/:id", controller.track);

router.get("/artists", controller.artists);
router.get("/artists/:id/tracks", controller.artistTracks);

router.get("/playlists", controller.playlists);
router.get("/playlists/:id/tracks", controller.playlistTracks);

router.get("/stream/:id", controller.stream);

export default router;
