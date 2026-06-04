import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import dashboardRouter from "./dashboard";
import cattleRouter from "./cattle";
import tasksRouter from "./tasks";
import fieldsRouter from "./fields";
import employeesRouter from "./employees";
import settingsRouter from "./settings";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(dashboardRouter);
router.use(cattleRouter);
router.use(tasksRouter);
router.use(fieldsRouter);
router.use(employeesRouter);
router.use(settingsRouter);

export default router;
