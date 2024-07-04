import WorkExperience from "../models/WorkExperience.js";

async function createWorkExperience(userId, workExperienceList) {
    try {
      await WorkExperience.destroy({ where: { serviceProviderId: userId } });
      const newWorkExperienceRecords = workExperienceList.map((experience) => ({
        ...experience,
        serviceProviderId: userId,
      }));
      console.log("newWorkExperienceRecords", newWorkExperienceRecords)
      const createdWorkExperienceRecords =
        await WorkExperience.bulkCreate(newWorkExperienceRecords);
      return createdWorkExperienceRecords;
    } catch (error) {
      throw new Error(error.message);
    }
}

async function fetchWorkExperience(userId) {
  try {
    const workExperienceData = await WorkExperience.findAll({
      where: { serviceProviderId: userId },
    });
    return workExperienceData;
  } catch (error) {
    throw new Error(error.message);
  }
}
  
export { createWorkExperience, fetchWorkExperience }