import { Router } from "express";
import {
  create,
  download,
  exportCsv,
  extract,
  getOne,
  list,
  remove,
  statsMonthly,
  statsSummary,
  update
} from "../controllers/invoiceController";
import { requireAuth } from "../middlewares/auth";
import { upload } from "../middlewares/upload";

const router = Router();

router.post(
  "/extract",
  requireAuth,
  upload.single("file"),
  (req, res, next) => extract(req, res).catch(next)
);

router.get("/export/csv", requireAuth, (req, res, next) => exportCsv(req, res).catch(next));
router.get("/stats/summary", requireAuth, (req, res, next) => statsSummary(req, res).catch(next));
router.get("/stats/monthly", requireAuth, (req, res, next) => statsMonthly(req, res).catch(next));

router.post("/", requireAuth, (req, res, next) => create(req, res).catch(next));
router.get("/", requireAuth, (req, res, next) => list(req, res).catch(next));

router.get("/:id/download", requireAuth, (req, res, next) => download(req, res).catch(next));
router.get("/:id", requireAuth, (req, res, next) => getOne(req, res).catch(next));
router.put("/:id", requireAuth, (req, res, next) => update(req, res).catch(next));
router.delete("/:id", requireAuth, (req, res, next) => remove(req, res).catch(next));

export default router;

