import { Router, type IRouter } from "express";
import healthRouter from "./health";
import futureReadyRouter from "./future-ready";

const router: IRouter = Router();

router.use(healthRouter);
router.use(futureReadyRouter);

export default router;
