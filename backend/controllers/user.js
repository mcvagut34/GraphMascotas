import neo4j from 'neo4j-driver';
import User from '../models/User.js';
import Pet from '../models/Pet.js';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import AdoptionRequest from '../models/AdoptionRequest.js';
import {crearError} from '../extra/error.js';
import RescueOrganization from '../models/RescueOrganization.js';
dotenv.config();


// Creación de la sesión
const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD)
);
const session = driver.session(process.env.NEO4J_DATABASE);

export const iniciarSesion = async (req, res) => {
  const session = driver.session();
  const io = req.app.get('io');

  try {
    const user = new User(session);
    const org = new RescueOrganization(session);
    const { usuario, password } = req.body;

    const usuarioAutenticado = await user.verificarCredenciales(usuario, password);
    const orgAutenticada = await org.verificarCredenciales(usuario, password);

    console.log('Usuario autenticado:', usuarioAutenticado);
    console.log('Organización autenticada:', orgAutenticada);

    if (!password) {
      res.status(400).json({ error: 'Ingrese su contraseña' });
      return;
    }

    if (usuarioAutenticado && !usuarioAutenticado.isOrganization) {
      const { isAdmin } = usuarioAutenticado;

      if (isAdmin) {
        res.status(403).json({ error: 'No autorizado para iniciar sesión' });
        return;
      }

      

      const token = jwt.sign({ usuario, isAdmin }, process.env.JWT_SECRET, { expiresIn: '1h' });

      res.status(200).json({ token, isOrganization: false });
    } else if (orgAutenticada && orgAutenticada.isOrganization) {
      io.to(req.socketId).emit('loginExitoso', { usuario, isOrganization: true });
      const token = jwt.sign({ isOrganization: orgAutenticada.isOrganization, organizationId: orgAutenticada.organizationId }, process.env.JWT_SECRET, { expiresIn: '1h' });
      res.status(200).json({ token, isOrganization: true });
    } else {
      res.status(401).json({ error: 'Contraseña incorrecta o usuario no autorizado' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  } finally {
    session.close();
  }
};



export const iniciarSesionAdmin = async (req, res) => {
  const session = driver.session();
  const io = req.app.get('io');

  try {
    const user = new User(session);
    const { usuario, password } = req.body;

    const usuarioAutenticado = await user.verificarCredenciales(usuario, password);

    if (!password) {
      res.status(400).json({ error: 'Ingrese su contraseña' });
      return;
    }

    if (usuarioAutenticado) {
      const { isAdmin } = usuarioAutenticado;

      if (isAdmin) {
        io.to(req.socketId).emit('loginExitoso', { usuario, isAdmin });

      const token = jwt.sign({ isAdmin }, process.env.JWT_SECRET, { expiresIn: '1h' });

      res.status(200).json({ token });
      }else{
        res.status(403).json({ error: 'No autorizado para iniciar sesión' });
        return;
      }
      
    } else {
      res.status(401).json({ error: 'Contraseña incorrecta' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  } finally {
    session.close();
  }
};


export const cerrarSesion = async (req, res) => {
  try {
    // Elimina el token del lado del cliente (por ejemplo, desde las cookies o almacenamiento local)
    res.clearCookie('token');  // Ejemplo si usas cookies, ajusta según tu configuración

    // Devuelve una respuesta exitosa o redirige a la página de inicio de sesión
    res.status(200).json({ message: 'Cierre de sesión exitoso' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al cerrar sesión' });
  }
};



export const createUser = async (req, res) => {
  const session = driver.session();
  try {
    // Operaciones en la base de datos Neo4j utilizando 'session'
    const user = new User(session);
    const newUser = await user.createUser(req.body);

    res.status(201).json(newUser);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear el usuario' });
  } finally {
    // Cierre de la sesión al finalizar la operación
    session.close();
  }
};

export const registro = async (req, res) => {
  const session = driver.session();

  const user= new User(session);

  try {
    const {
      nombre,
      apellido,
      email,
      usuario,
      password,
      pais,
      ciudad,
      telefono,
      fecha_nacimiento,
    } = req.body;

    // Check if the user with the same email or username already exists
    const existingUser = await user.findByEmailOrUsername(email, usuario);

    if (existingUser) {
      // User with the same email or username already exists
      throw crearError(400, 'El usuario o email ya está registrado.');
    }
    const userData = { nombre, apellido, email, usuario, password, pais, ciudad, telefono, fecha_nacimiento, isAdmin: false, isOrganization: false };
    
    const createdUser = await user.create(userData);

    res.status(201).json({ message: 'Registro exitoso', user: createdUser });
  } catch (error) {
    console.error(error);

    if (error.status) {
      // If it's a known error (e.g., user already exists), send appropriate status and message
      res.status(error.status).json({ error: error.message });
    } else {
      // If it's an unknown error, send a generic 500 status and message
      res.status(500).json({ error: 'Error al registrar el usuario' });
    }
  } finally {
    session.close();
  }
};
   



export const getUserByUsername = async (req, res) => {
  const session = driver.session();
  try {
    const user = new User(session);
    const username = req.params.username; // Asegúrate de que el parámetro coincida con el nombre en tu ruta
    console.log('Username:', username); // Agrega este registro de depuración

    const foundUser = await user.findUserByUsername(username);

    if (foundUser) {
      res.status(200).json(foundUser);
    } else {
      res.status(404).json({ error: 'Usuario no encontrado' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener el usuario' });
  } finally {
    session.close();
  }
};



export const updateUser = async (req, res) => {
  const session = driver.session();
  try {
    const user = new User(session);
    const userId = req.params.username; // O puedes usar req.params.elementId si prefieres
    const updatedProperties = req.body; // Debes enviar las propiedades actualizadas en el cuerpo de la solicitud

    const updatedUser = await user.updateUser(userId, updatedProperties);

    if (updatedUser) {
      res.status(200).json(updatedUser);
    } else {
      res.status(404).json({ error: 'Usuario no encontrado' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar el usuario' });
  } finally {
    session.close();
  }
};


export const deleteUser = async (req, res) => {
  const session = driver.session();
  try {
    const user = new User(session);
    const userId = req.params.username; // O puedes usar req.params.elementId si prefieres

    await user.deleteUser(userId);

    res.status(204).send(); // Devuelve una respuesta vacía (sin contenido) si se elimina correctamente
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar el usuario' });
  } finally {
    session.close();
  }
};

export const solicitarAdopcion = async (req, res) => {
  const session = driver.session();
  const io = req.app.get('io');

  try {
    const adoptionRequest = new AdoptionRequest(session);
    const { usuario, mascotaId } = req.body;

    const mascotaAdoptada = await adoptionRequest.verificarMascotaAdoptada(mascotaId);

    if (mascotaAdoptada) {
      // Si la mascota ya fue adoptada, retornar un error o manejar de acuerdo a tu lógica
      return res.status(400).json({ error: 'Esta mascota ya ha sido adoptada' });
    }

    // Verificar si el usuario ya tiene una solicitud pendiente para esa mascota
    const existingRequest = await adoptionRequest.verificarSolicitudPendiente(usuario, mascotaId);

    if (existingRequest) {
      // Si ya tiene una solicitud pendiente, retornar un error o manejar de acuerdo a tu lógica
      return res.status(400).json({ error: 'Ya existe una solicitud pendiente para esta mascota' });
    }

    const mascota = new Pet(session);
    const infoMascota = await mascota.findOrganizationIdByUUID(mascotaId);
    const organizationId = infoMascota.organizationId;

    if (!organizationId) {
      return res.status(400).json({ error: 'No se pudo obtener el organizationId de la mascota' });
    }

    // Si no hay solicitud pendiente, proceder con la solicitud de adopción
  
    await adoptionRequest.solicitarAdopcion(usuario, mascotaId);

    io.emit('notificacion', {
      mensaje: `¡Atención! ha solicitado adoptar la mascota.`
    });

    console.log(`Notificación emitida a la organización ${organizationId}`);

    res.status(200).json({ message: 'Solicitud de adopción enviada exitosamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al solicitar la adopción' });
  } finally {
    session.close();
  }


};
//HASH TABLE

const favoritosPorUsuario = {};

export const agregarFavorito = async (req, res) => {
  try {
    const { mascota } = req.body;
    const usuario = req.user.username; // Obtener el usuario desde el token o sesión (ajusta según tu lógica de autenticación)
    
    // Verificar que la información de la mascota está presente
    if (!mascota || !mascota.mascotaId || !mascota.categoria || !mascota.raza) {
      return res.status(400).json({ mensaje: 'Información de la mascota incompleta' });
    }

    const { id: mascotaId, categoria, raza } = mascota;

    // Agregar favorito a la "hash table" en memoria
    if (!favoritosPorUsuario[usuario]) {
      favoritosPorUsuario[usuario] = {};
    }

    favoritosPorUsuario[usuario][mascotaId] = { categoria, raza };

    // Actualizar en la base de datos usando el modelo
    const userModel = new User(session);
    const exitoso = await userModel.agregarFavorito(usuario, mascotaId, categoria, raza);

    if (exitoso) {
      res.status(200).json({ mensaje: 'Mascota agregada a favoritos exitosamente' });
    } else {
      res.status(500).json({ mensaje: 'Error al agregar la mascota a favoritos' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al agregar la mascota a favoritos' });
  }
};

// export const obtenerFavoritosPorUsuario = (req, res) => {
//   try {
//     const { usuario } = req.params;

//     // Obtener favoritos desde la "hash table" en memoria
//     const favoritos = favoritosPorUsuario[usuarioId] || {};

//     res.status(200).json({ favoritos });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ mensaje: 'Error al obtener los favoritos por usuario' });
//   }
// };



