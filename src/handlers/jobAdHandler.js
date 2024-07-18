import JobAd from "../models/JobAd.js";
import { format } from "date-fns";
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

async function fetchAllJobAdSummaryData(clientId) {
  try {
    const jobs = await JobAd.findAll({
      where: { clientId: clientId },
      attributes: ['id','title', 'category', 'status', 'createdAt']
    });
    const formattedJobs = jobs.map(job => {
      return {
        ...job.get({ plain: true }),
        createdAt: formatDate(job.createdAt)
      };
    });
    console.log("Formatted jobs_", formattedJobs)
    return formattedJobs;
  }
  catch (error) {
    throw new Error(error.message);
  }
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return format(date, 'mm/dd/yyyy HH:mm:ss');
}

export { createJobAd, fetchAllJobAdSummaryData }