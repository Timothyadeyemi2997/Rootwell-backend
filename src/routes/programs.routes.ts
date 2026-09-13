import { Router } from "express";
import { getPrograms } from "../controllers/programs.controller";

const router = Router();
router.get("/", getPrograms);

export default router;