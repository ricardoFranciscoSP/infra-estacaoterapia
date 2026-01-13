import { Router } from "express";
import financeiroRoutes from "./financeiro.routes";
import configAgendaRoutes from "./configAgenda.routes";
import consultasRoutes from "./consultas.routes";
import userRoutes from "./userPsicologo.routers";

const router = Router();

router.use("/financeiro", financeiroRoutes);
router.use("/config-agenda", configAgendaRoutes);
router.use("/consultas", consultasRoutes);
router.use("/user", userRoutes);

export default router;