import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import chatRouter from "./chat";
import documentsRouter from "./documents";
import bookmarksRouter from "./bookmarks";
import userRouter from "./user";
import statsRouter from "./stats";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(chatRouter);
router.use(documentsRouter);
router.use(bookmarksRouter);
router.use(userRouter);
router.use(statsRouter);

export default router;
