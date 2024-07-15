import ServiceProvider from "../models/ServiceProvider.js";
import Client from "../models/Client.js";
import bcrypt from "bcrypt";
import { userInfo } from "os";

async function _comparePasswords(password, hashPassword) {
    return bcrypt.compareSync(password, hashPassword);
  }
  
  async function _hashPassword(password) {
    return await bcrypt.hash(password, 10);
  }

  
async function checkCurrentAndUpdateNewPassword(model, userId, currentPassword, newPassword) {
    try {
        let user;
        const userModel = model === 'ServiceProvider' ? ServiceProvider : Client;
            user = await userModel.findByPk(userId);
            if (!user) {
                throw new Error(`${model} with id ${userId} not found.`)
            }
            const matchedCurrentPassword = await _comparePasswords(currentPassword, user.password);
            if (!matchedCurrentPassword) {
                throw new Error("Current password does not match the actual password.");
            }
   
            let newPassswordHashed = await _hashPassword(newPassword);
            await user.update({ password: newPassswordHashed })
            return { success: true, message: "Password updated successfully." };
    } catch (error) {
        throw new Error("Error while updating password: " + error.message);
    }
}

async function deleteAccount(model, userId) {
    try {
        const userModel = model === 'ServiceProvider' ? ServiceProvider : Client;
        const userDeleted =  await userModel.destroy({
            where: {
              id: userId,
            },
        });
        if (userDeleted) {
            return { success: true, message: "Account deleted successfully." };
        }
        else {
            return { success: false, message: `${model} with id ${userId} not found.` };
        }
    } catch (error) {
        return { success: false, message: "Error while deleting account: " + error.message };
    }
}

async function deactivateAccount(model, userId) {
    try {
        const userModel = model === 'ServiceProvider' ? ServiceProvider : Client;
        const userAccount = await userModel.findByPk(userId);
        if (!userAccount) {
            throw new Error(`${model} with id ${userId} not found.`)
        }
        await userAccount.update({ status: 'deactivated' });
            return { success: true, message: "Account deactivated successfully." };
    } catch (error) {
        return { success: false, message: "Error while deactivating account: " + error.message };
    }
}

async function reactivateAccont(email, password) {
    try {
        let userInstance = await ServiceProvider.findOne({ where: { email } });
        if (!userInstance) {
            userInstance = await Client.findOne({ where: { email }});
        }
        if (!userInstance) {
            return { message: 'User not found.' };
        }
        const isPasswordMatch = await _comparePasswords(password, userInstance.password);
        if (!isPasswordMatch) {
            return { message: 'Incorrect passwrod. ' };
        }
        await userInstance.update({ status: 'active' }) 
        userInstance = await userInstance.reload();
        return { success: true, user: userInstance };
     }
    catch (error) {
        throw new Error("Error while reactivating account: " + error.message);
    }
}

export { checkCurrentAndUpdateNewPassword, deleteAccount, deactivateAccount, reactivateAccont };