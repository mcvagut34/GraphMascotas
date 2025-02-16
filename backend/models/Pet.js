class Pet {
    constructor(session) {
      this.session = session;
    }
  
    async createPet(properties) {
      const result = await this.session.run('CREATE (pet:Mascota $properties) RETURN pet', {
        properties,
      });
  
      return result.records[0].get('pet').properties;
    }
    // En tu modelo Pet.js
async findPetByInfo({ nombre, categoria, edad, sexo, color, tamaño, ubicacion }) {
  const transaction = this.session.beginTransaction();

  try {
    const result = await transaction.run(
      'MATCH (m:Mascota) WHERE ' +
      'm.nombre = $nombre AND ' +
      'm.categoria = $categoria AND ' +
      'm.edad = $edad AND ' +
      'm.sexo = $sexo AND ' +
      'm.color = $color AND ' +
      'm.tamaño = $tamaño AND ' +
      'm.ubicacion = $ubicacion ' +
      'RETURN m',
      {
        nombre,
        categoria,
        edad,
        sexo,
        color,
        tamaño,
        ubicacion
      }
    );

    await transaction.commit();

    if (result.records.length > 0) {
      // Devuelve la primera mascota encontrada
      return result.records[0].get('m').properties;
    } else {
      return null;
    }
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

  
    async findPetByUUID(uuid) {
      const result = await this.session.run('MATCH (pet:Mascota {mascotaId: $uuid}) RETURN pet', {
        uuid,
      });
    
      if (result.records.length === 0) {
        return null; // Mascota no encontrada
      }
    
      return result.records[0].get('pet').properties;
    }

    // async findOnlyByUUID(uuid) {
    //   const result = await this.session.run('MATCH (pet:Mascota {id: $uuid}) RETURN pet.id AS uuid', {
    //     uuid,
    //   });
    
    //   if (result.records.length === 0) {
    //     return null; // Mascota no encontrada
    //   }
    
    //   return result.records[0].get('uuid');
    // }

    async findOnlyByUUID(uuid) {
      const result = await this.session.run(
          'MATCH (pet:Mascota {mascotaId: $uuid}) RETURN pet',
          {
              uuid,
          }
      );
  
      if (result.records.length > 0) {
          return result.records[0].get('pet');
      } else {
          return null;
      }
  }

  async findOrganizationIdByUUID(uuid) {
    const result = await this.session.run(
        'MATCH (pet:Mascota {mascotaId: $uuid}) RETURN pet',
        {
            uuid,
        }
    );

    if (result.records.length > 0) {
      const mascota = result.records[0].get('pet').properties;
      return mascota;    
    } else {
        return null;
    }
}

    
  
    async updatePet(uuid, updatedProperties) {
      const result = await this.session.run(
        'MATCH (pet:Mascota {mascotaId: $uuid}) SET ' +
        Object.keys(updatedProperties).map(key => `pet.${key} = $updatedProperties.${key}`).join(', ') +
        ' RETURN pet',
        {
          uuid,
          updatedProperties,
        }
      );
    
      if (result.records.length === 0) {
        return null; // Mascota no encontrada
      }
    
      return result.records[0].get('pet').properties;
    }
    
    
    
    
  
    async deletePet(petId) {
      await this.session.run('MATCH (pet:Mascota {mascotaId: $id}) DETACH DELETE pet', {
        id: petId,
      });
    }

    async updatePetAdoptionStatus(uuid, newStatus) {
      const transaction = this.session.beginTransaction();
  
      try {
        await transaction.run(
          'MATCH (pet:Mascota {mascotaId: $uuid}) SET pet.estadoAdopcion = $newStatus',
          {
            uuid,
            newStatus,
          }
        );
  
        await transaction.commit();
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    }
  
    async assignToRescueOrganization(petId, organizationId) {
      await this.session.run(
        'MATCH (pet:Mascota {mascotaId: $petId}), (org:OrganizacionRescate {id: $organizationId}) ' +
        'CREATE (pet)-[:PERTENECE_A]->(org)',
        {
          petId,
          organizationId,
        }
      );
    }
  
    async  obtenerMascotasPorCategoria (categoria) {
      const transaction = this.session.beginTransaction();
    
      try {
        const query = `
          MATCH (m:Mascota {categoria: $categoria})
          RETURN m
        `;
    
        const result = await transaction.run(query, { categoria });
        const mascotas = result.records.map(record => record.get('m').properties);
    
        await transaction.commit();
    
        return mascotas;
      } catch (error) {
        await transaction.rollback();
        console.error("Error al ejecutar la consulta Cypher:", error);
        throw error;
      }
    };

    async getAllPetsByUUID() {
      const result = await this.session.run('MATCH (pet:Mascota) RETURN pet');
    
      return result.records.map(record => record.get('pet').properties);
    }

    
    async getAllPetsByOrganizationId(organizationId) {
      const result = await this.session.run(
        'MATCH (org:OrganizacionRescate {organizationId: $organizationId})-[:PONE_EN_ADOPCION]->(pet:Mascota) RETURN pet',
        { organizationId }
      );
    
      return result.records.map((record) => record.get('pet').properties);
    }

    async getPetsByAdoptionStatus() {
      const result = await this.session.run(
        'MATCH (pet:Mascota) WHERE pet.estadoAdopcion = "Pendiente" OR pet.estadoAdopcion = "Disponible" RETURN pet'
      );
    
      return result.records.map((record) => record.get('pet').properties);
    }
    
    async searchPetsCypher(query) {
      try {
        const result = await this.session.run(
          'MATCH (m:Mascota) WHERE toLower(m.nombre) CONTAINS toLower($query) RETURN m',
          { query }
        );
  
        const foundPets = result.records.map((record) => record.get('m').properties);
        return foundPets;
      } catch (error) {
        console.error('Error al buscar mascotas:', error);
        throw error;
      }
    }    
  }

  
  export default Pet;
  