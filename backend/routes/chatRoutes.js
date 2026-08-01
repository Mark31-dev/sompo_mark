import { Router } from "express";

import * as controller from "../controllers/chatController.js";
import { requireUser } from "../middleware/auth.js";

const router = Router({ mergeParams: true });

router.get("/:id/messages", controller.index);
router.post("/:id/messages", requireUser, controller.create);
router.post("/:id/messages/:messageId/reactions", requireUser, controller.react);
router.patch("/:id/messages/:messageId/pin", requireUser, controller.pin);
router.delete("/:id/messages/:messageId", requireUser, controller.destroy);

export default router;
