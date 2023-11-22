import express from 'express';
import {
  createPet,
  getPetByUUID,
  updatePet,
  deletePet,
  getPetsByCategory,
  getAllPetsByUUID,
  getAllPetsByOrganizationId
} from '../controllers/pet.js';
import {verificar} from '../extra/verificarToken.js';

const router = express.Router();

router.post('/',verificar, createPet);
router.get('/:uuid', getPetByUUID);
router.get('/', getAllPetsByUUID);
router.put('/:uuid', updatePet); 
router.delete('/:id', deletePet);

router.get('/categoria/:categoria', getPetsByCategory);

router.get('/mascotas/:organizationId', getAllPetsByOrganizationId)


export default router;
