import { Router } from 'express';
import { AddressController } from '../controllers/address.controller';

const router = Router();
const controller = new AddressController();

router.post('/', controller.create.bind(controller));
router.get('/user/:userId', controller.listByUser.bind(controller));
router.get('/cep/:cep', controller.getAddressByCep.bind(controller));

export default router;
