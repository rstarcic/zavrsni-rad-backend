import ServiceProvider from "../models/ServiceProvider.js";

async function updateDataByUserId(userData) {
    try {
        console.log(userData);
    const user = await ServiceProvider.findByPk(userData.userId);
    if (user) {
      const {
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
      } = userData;

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

      await user.save();
      return user;
    } else {
      throw new Error("User not found");
    }
  } catch (error) {
    throw new Error(error.message);
  }
}

async function updateAboutMeFieldByUserId(aboutMe, userId) {
  const user = await ServiceProvider.findByPk(userId);
  if (user) {
    user.aboutMeSummary = aboutMe;
    user.save();
    return user;
  }
  return null;
}

async function updateSkillsByUserId(skills, userId) {
  const user = await ServiceProvider.findByPk(userId);
  console.log(user)
  if (user) {
    user.skills = skills;
    user.save();
    return user;
  }
  return null;
}

async function fetchAboutMeText() {
  try {
    const aboutMeData = await ServiceProvider.findAll({
      where: { serviceProviderId: userId },
      attributes: ['aboutMeSummary']
    });
    return aboutMeData;
  } catch (error) {
    throw new Error(error.message);
  }
}

async function fetchSkills() {
  try {
    const skillsData = await ServiceProvider.findAll({
      where: { serviceProviderId: userId },
      attributes: ['skills']
    });
    return skillsData;
  } catch (error) {
    throw new Error(error.message);
  }
}

export { updateDataByUserId, updateAboutMeFieldByUserId, updateSkillsByUserId, fetchAboutMeText, fetchSkills }