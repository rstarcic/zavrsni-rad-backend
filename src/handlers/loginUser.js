import bcrypt from "bcrypt";
import Client from "../models/Client.js";
import ServiceProvider from "../models/ServiceProvider.js";
import jwt from "jsonwebtoken";

async function _comparePasswords(password, hashPassword) {
  return bcrypt.compareSync(password, hashPassword);
}

function _excludeProperties(obj, excludedProps) {
  const { [excludedProps]: _, ...result } = obj;
  return result;
}

async function checkCredentials(email, password) {
  try {
    let userInstance = await Client.findOne({ where: { email: email } });

    if (userInstance) {
      let user = userInstance.get({ plain: true });
      if (user.status === 'deactivated') {
        return { error: 'deactivated', message: 'Your account is deactivated. Do you want to activate it?' };
      }
      const isPasswordMatch = await _comparePasswords(password, user.password);
      if (isPasswordMatch) {
        return _excludeProperties(user, "password");
      } else {
        return null;
      }
    }

    userInstance = await ServiceProvider.findOne({ where: { email: email } });
    if (userInstance) {
      let user = userInstance.get({ plain: true });
      if (user.status === 'deactivated') {
        return { error: 'deactivated', message: 'Your account is deactivated. Do you want to activate it?' };
      }
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

function generateToken(user) {
  const payload = { userId: user.id, role: user.role };
  if (user.role === "client") {
    payload.type = user.type;
  }
  return jwt.sign(payload, process.env.SECRET_TOKEN, { expiresIn: "1h" });
}

export { checkCredentials, generateToken };
