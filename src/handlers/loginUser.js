import bcrypt from "bcrypt";
import Client from "../models/Client.js";
import ServiceProvider from "../models/ServiceProvider.js";

async function _comparePasswords(password, hashPassword) {
  return bcrypt.compareSync(password, hashPassword);
}

function _excludeProperties(obj, excludedProps) {
  const { [excludedProps]: _, ...result } = obj;
  return result;
}

async function checkCredentials(email, password) {
  try {
    let user = await Client.findOne({ where: { email: email } });
    if (user) {
      const isPasswordMatch = await _comparePasswords(password, user.password);
      if (isPasswordMatch) {
        return _excludeProperties(user, "password");
      } else {
        return null;
      }
    }

    user = await ServiceProvider.findOne({ where: { email: email } });
    if (user) {
      const isPasswordMatch = await _comparePasswords(password, user.password);
      if (isPasswordMatch) {
        return _excludeProperties(user, "password");
      } else {
        return null;
      }
    }
    return null;
  } catch (error) {
    console.error("Error in checkCredentials:", error.message);
    throw new Error("Error during credentials check");
  }
}

export { checkCredentials };
