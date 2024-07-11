import WorkExperience from "../models/WorkExperience.js";

async function updateOrCreateWorkExperience(userId, workExperience) {
  try {
    const existingRecord = await WorkExperience.findOne({
      where: {
        serviceProviderId: userId,
      }
    })
    let updatedWorkExperienceRecord;
    if (existingRecord) {
      updatedWorkExperienceRecord = await existingRecord.update({
        ...workExperience, serviceProviderId: userId
      })
    } else {
      updatedWorkExperienceRecord =  await WorkExperience.create({
        ...workExperience,
        serviceProviderId: userId
      });
    }
    return updatedWorkExperienceRecord;
  } catch (error) {
    throw new Error(error.message);
  }
}

async function fetchWorkExperienceByUserId(userId) {
  try {
    const workExperienceData = await WorkExperience.findOne({
      where: { serviceProviderId: userId },
    });
    return workExperienceData;
  } catch (error) {
    throw new Error(error.message);
  }
}
  
export { updateOrCreateWorkExperience, fetchWorkExperienceByUserId }