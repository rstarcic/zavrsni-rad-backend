import WorkExperience from "../models/WorkExperience.js";

async function createWorkExperience(userId, workExperienceList) {
    try {
      await WorkExperience.destroy({ where: { serviceProviderId: userId } });
      const newWorkExperienceRecords = workExperienceList.map((experience) => ({
        ...experience,
        serviceProviderId: userId,
      }));
      const createdWorkExperienceRecords =
        await WorkExperience.bulkCreate(newWorkExperienceRecords);
      return createdWorkExperienceRecords;
    } catch (error) {
      throw new Error(error.message);
    }
}
  
export { createWorkExperience }