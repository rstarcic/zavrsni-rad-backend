import Education from "../models/Education.js";

async function createEducation(userId, educationList) {
  try {
    await Education.destroy({ where: { serviceProviderId: userId } });
    const newEducationRecords = educationList.map((education) => ({
      ...education,
      serviceProviderId: userId,
    }));
    console.log("newEducationRecords", newEducationRecords);
    const createdEducationRecords =
      await Education.bulkCreate(newEducationRecords);
    return createdEducationRecords;
  } catch (error) {
    throw new Error(error.message);
  }
}

async function fetchEducation(userId) {
  try {
    const educationData = await Education.findAll({
      where: { serviceProviderId: userId },
    });
    return educationData;
  } catch (error) {
    throw new Error(error.message);
  }
}

export { createEducation, fetchEducation };
