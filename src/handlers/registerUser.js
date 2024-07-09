import bcrypt from "bcrypt";
import ServiceProvider from "../models/ServiceProvider.js";
import Client from "../models/Client.js";

async function _hashPassword(password) {
    return await bcrypt.hash(password, 10);
}

function _excludeProperties(obj, excludedProps) {
    const { [excludedProps]: _, ...result } = obj;
    return result;
}

async function registerUser(userData, model) {
  try {
    userData.password = await _hashPassword(userData.password);
    let user;
    
    if (model === ServiceProvider) {
      user = await ServiceProvider.create(userData);
    } else if (model === Client) {
      user = await Client.create(userData, null);
    }
    else {
      throw new Error('Invalid model provided.');
    }
    console.log(user);
    if (user.dataValues) {
       return _excludeProperties(user.dataValues, 'password');
    } else {
      throw new Error('User not created.');
    }
  } catch (error) {
    throw new Error('Error in user registration: ' + error);
  }
}

export { registerUser };