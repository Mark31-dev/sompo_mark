import { Router } from "express";

import * as controller from "../controllers/roomController.js";
import { requireUser } from "../middleware/auth.js";

const router = Router();

router.get("/", controller.index);
router.get("/:id", controller.show);

router.post("/", requireUser, controller.create);
router.patch("/:id", requireUser, controller.update);
router.delete("/:id", requireUser, controller.destroy);
router.post("/:id/join", requireUser, controller.join);
router.post("/:id/leave", requireUser, controller.leave);

export default router;
