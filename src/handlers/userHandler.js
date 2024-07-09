import Client from "../models/Client.js";
import ServiceProvider from "../models/ServiceProvider.js";

async function fetchClientDataById(clientId) {
  try {
    const userInstance = await Client.findByPk(clientId);
      if (userInstance) {
        let user = userInstance.get({ plain: true });
      return user;
    } else {
      return null;
    }
  } catch (error) {
    throw new Error(error.message);
  }
}

async function fetchServiceProviderById(serviceProviderId) {
  try {
    const userInstance = await ServiceProvider.findByPk(serviceProviderId);
      if (userInstance) {
        let user = userInstance.get({ plain: true });
      return user;
    } else {
      return null;
    }
  } catch (error) {
    throw new Error(error.message);
  }
}

export { fetchClientDataById, fetchServiceProviderById };
