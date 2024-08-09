import Client from "../models/Client.js";
import ServiceProvider from "../models/ServiceProvider.js";

async function fetchClientDataById(clientId) {
  try {
    const userInstance = await Client.findByPk(clientId, { attributes: { exclude: ['password'] } });
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
    const userInstance = await ServiceProvider.findByPk(serviceProviderId, { attributes: { exclude: ['password' , 'iban', 'bankName'] } });
      if (userInstance) {
        let user = userInstance.get({ plain: true });
        console.log(user);
      return user;
    } else {
      return null;
    }
  } catch (error) {
    throw new Error(error.message);
  }
}

async function fetchServiceProviderRoleById(serviceProviderId) {
  try {
    const user = await ServiceProvider.findByPk(serviceProviderId, { attributes: ['role'] });
    if (user) {
      return user.role; 
    } else {
      return null;
    }
  } catch (error) {
    throw new Error(error.message);
  }
}

async function fetchClientRoleAndTypeById(clientId) {
  try {
    const user = await Client.findByPk(clientId, { attributes: ['role', 'type'] });
    console.log(user);
    if (user) {
      return { role: user.role, type: user.type };
    } else {
      return null;
    }
  } catch (error) {
    throw new Error(error.message);
  }
}

async function fetchBankDetailsDataByServiceProviderId(serviceProviderId) {
  try {
    const userBankDetails = await ServiceProvider.findByPk(serviceProviderId);
    if (userBankDetails) {
      const hasBankDetails = !!userBankDetails.iban && !!userBankDetails.bankName;
      return hasBankDetails;
    } else {
      return null;
    }
  } catch (error) {
    throw new Error(error.message);
  }
}

async function updateBankDetailsDataByServiceProviderId(serviceProviderId, iban, bankName) {
  try {
    const serviceProvider = await ServiceProvider.findByPk(serviceProviderId);
    if (!serviceProvider) {
      throw new Error('Service provider not found');
    }
    serviceProvider.iban = iban;
    serviceProvider.bankName = bankName;
    await serviceProvider.save(); 
    return true;
  } catch (error) {
    throw new Error(error.message);
  }
}

async function updateServiceProviderWithStripeAccountId(serviceProviderId, stripeAccountId) {
  try {
    const serviceProvider = await ServiceProvider.findByPk(serviceProviderId);
    if (!serviceProvider) {
      throw new Error('Service provider not found');
    }
    serviceProvider.serviceProviderStripeAccountId  = stripeAccountId;
    await serviceProvider.save(); 
    return true;
  } catch (error) {
    throw new Error(error.message);
  }
}

export { fetchClientDataById, fetchServiceProviderById, fetchServiceProviderRoleById, fetchClientRoleAndTypeById, fetchBankDetailsDataByServiceProviderId, updateBankDetailsDataByServiceProviderId, updateServiceProviderWithStripeAccountId };
