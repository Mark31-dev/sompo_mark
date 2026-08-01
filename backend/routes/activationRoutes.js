import { Router } from "express";

import * as controller from "../controllers/activationController.js";
import { requireAdmin, requireUser } from "../middleware/auth.js";

const router = Router();

router.post("/verify", controller.verify);
router.get("/me", requireUser, controller.me);

router.get("/codes", requireAdmin, controller.index);
router.post("/codes", requireAdmin, controller.create);
router.patch("/codes/:id", requireAdmin, controller.toggle);

export default router;
