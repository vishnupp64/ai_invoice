import { Router } from "express";
import { getMe, updateMe } from "../controllers/meController";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.get("/", requireAuth, (req, res, next) => getMe(req, res).catch(next));
router.put("/", requireAuth, (req, res, next) => updateMe(req, res).catch(next));

export default router;

