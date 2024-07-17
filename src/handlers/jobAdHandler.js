import JobAd from "../models/JobAd.js";

async function createJobAd(jobAdData, clientId) {
  try {
   const newCreatedJob =  await JobAd.create({
        ...jobAdData,
        clientId: clientId
   });
      return newCreatedJob
  } catch (error) {
    throw new Error(error.message);
  }
}

export { createJobAd }