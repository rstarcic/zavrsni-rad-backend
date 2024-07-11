import Education from "../models/Education.js";

async function updateOrCreateEducation(userId, education) {
  try {
    const existingRecord = await Education.findOne({
      where: {
        serviceProviderId: userId,
      }
    })
    let updatedEducationRecord;
    if (existingRecord) {
      updatedEducationRecord = await existingRecord.update({
        ...education, serviceProviderId: userId
      })
    } else {
      updatedEducationRecord =  await Education.create({
        ...education,
        serviceProviderId: userId
      });
    }
    return updatedEducationRecord;
  } catch (error) {
    throw new Error(error.message);
  }
}

async function fetchEducationByUserId(userId) {
  try {
    const educationData = await Education.findOne({
      where: { serviceProviderId: userId },
    });
    return educationData;
  } catch (error) {
    throw new Error(error.message);
  }
}


export { updateOrCreateEducation, fetchEducationByUserId };
