import ServiceProvider from "../models/ServiceProvider.js";
import Client from "../models/Client.js";
import { Buffer } from 'buffer';

async function updateServiceProviderDataByUserId(userData, userId) {
    try {
        console.log(userData.skills);
    const user = await ServiceProvider.findByPk(userId);
    if (user) {
      const {
        aboutMeSummary,
        profileImage,
        firstName,
        lastName,
        gender,
        dateOfBirth,
        phoneNumber,
        country,
        city,
        address,
        postalCode,
        documentType,
        documentNumber,
        skills
      } = userData;

      if (aboutMeSummary) user.aboutMeSummary = aboutMeSummary;
      if (profileImage) user.profileImage = profileImage;
      if (firstName) user.firstName = firstName;
      if (lastName) user.lastName = lastName;
      if (gender) user.gender = gender;
      if (dateOfBirth) user.dateOfBirth = dateOfBirth;
      if (phoneNumber) user.phoneNumber = phoneNumber;
      if (country) user.country = country;
      if (city) user.city = city;
      if (address) user.address = address;
      if (postalCode) user.postalCode = postalCode;
      if (documentType) user.documentType = documentType;
      if (documentNumber) user.documentNumber = documentNumber;
      if (skills) user.skills = userData.skills;

      await user.save();
      return user;
    } else {
      throw new Error("User not found");
    }
  } catch (error) {
    throw new Error(error.message);
  }
}

async function fetchServiceProviderProfileImage(userId) {
  try {
    const profileImage = await ServiceProvider.findOne({
      where: { serviceProviderId: userId },
      attributes: ['profileImage']
    });
    return profileImage;
  } catch (error) {
    throw new Error(error.message);
  }
}

async function updateClientDataByUserId(clientData, userId) {
  try {
    const clientInstance = await Client.findByPk(userId);
    if (!clientInstance) {
      throw new Error('Client not found');
    }
   Object.assign(clientInstance, clientData);
    await clientInstance.save();
    const updatedUser = clientInstance.get({ plain: true });
    return updatedUser;
  } catch (error) {
    console.error('Error updating client data:', error);
    throw new Error(error.message);
  }
}

async function fetchClientProfileImage(userId) {
  try {
    const profileImage = await Client.findOne({
      where: { id: userId },
      attributes: ['imageType', 'profileImage']
    });
    return profileImage;
  } catch (error) {
    throw new Error(error.message);
  }
}

async function decodeBase64Image(profileImage) {
  console.log(profileImage)
  const matches = profileImage.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);

  const imageType = matches[1]; 
  const base64Data = matches[2]; 

  const imageBuffer = Buffer.from(base64Data, 'base64');
  console.log(`The size of the image buffer is ${imageBuffer.length} bytes.`);
  console.log("imageType",imageType);
  console.log("base64", base64Data);
  console.log("buffer",imageBuffer);
  return { imageBuffer, imageType };
}

async function encodeBase64Image(profileImage, imageType) {
  const imageBase64 = profileImage.toString('base64');
  const imageDataUrl = `data:${imageType};base64,${imageBase64}`;
  return imageDataUrl;
}

export { updateServiceProviderDataByUserId, fetchServiceProviderProfileImage, updateClientDataByUserId, fetchClientProfileImage, decodeBase64Image, encodeBase64Image }