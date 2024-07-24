import JobAd from "../models/JobAd.js";
import { format } from "date-fns";
import Client from "../models/Client.js";

function formatDate(dateString) {
  const date = new Date(dateString);
  return format(date, 'MM/dd/yyyy HH:mm:ss');
}

function formatDateToInput(date) {
  const d = new Date(date);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const year = d.getFullYear();

  return `${year}-${month}-${day}`;
}

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

async function fetchAllJobSummaryDataByClientId(clientId) {
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

async function fetchAllJobsSummaries(limit) {
  try {
    const jobs = await JobAd.findAll({
      where: { status: 'active' },
      attributes: ['id', 'title', 'category', 'hourlyRate', 'paymentCurrency', 'location', 'contactInfo'],
      order: [['createdAt', 'DESC']],
      limit: limit
    });
    const plainJobs = jobs.map(job => job.get({ plain: true }));
    console.log(plainJobs)
    return plainJobs;
  }
  catch (error) {
    throw new Error(error.message);
  }
}

async function fetchPostedJobDetailDataByClientId(clientId, jobId) {
  try {
    const job = await JobAd.findOne({
      where: { clientId: clientId, id: jobId },
    });
    const formattedJob= {
    ...job.get({ plain: true }),
    createdAt: formatDate(job.createdAt),
      updatedAt: formatDate(job.updatedAt),
      workDeadline: formatDateToInput(job.workDeadline),
      applicationDeadline: formatDateToInput(job.applicationDeadline)
  };
  console.log("Formatted job", formattedJob)
  return formattedJob;
 }
  catch (error) {
    throw new Error(error.message);
  }
}

async function updatePostedJobAdDataByClientId(clientId, jobId, dataToUpdate) {
  try {
    const job = await JobAd.findOne({
      where: { clientId: clientId, id: jobId },
    });

    await job.update(dataToUpdate);

    const formattedJob= {
    ...job.get({ plain: true }),
    createdAt: formatDate(job.createdAt),
      updatedAt: formatDate(job.updatedAt),
      workDeadline: formatDateToInput(job.workDeadline),
      applicationDeadline: formatDateToInput(job.applicationDeadline)
    };
  console.log("Formatted job", formattedJob)
  return formattedJob;
 }
  catch (error) {
    throw new Error(error.message);
  }
}

async function deletePostedJobAdByClientIdAndJobId(clientId, jobId) {
  try {
    const job = await JobAd.destroy({
      where: { clientId: clientId, id: jobId },
    });

    console.log("Job deleted", job)
    return job;
  }
  catch (error) {
    throw new Error(error.message);
  }
}

async function updateJobAdStatus(clientId, jobId, status) {
  try {
    const job = await JobAd.findOne({
      where: { clientId: clientId, id: jobId },
    });
    const newStatus = (status === 'active') ? 'inactive' : 'active';
    await job.update({ status: newStatus }); 
    return job;
  } catch (error) {
    throw new Error(error.message);
  }
}

async function fetchJobDetailsWithClientData(jobId) {
  try {
    const jobDetails = await JobAd.findByPk(jobId, {
      include: {
        model: Client,
        attributes: ['id', 'firstName', 'lastName', 'companyName', 'profileImage', 'imageType', 'type']
      }
    });
    if (!jobDetails) {
      throw new Error('Job not found');
    }
    const clientDetails = {
      id: jobDetails.Client.id,
      profileImage: jobDetails.Client.profileImage,
      imageType: jobDetails.Client.imageType,
      type: jobDetails.Client.type
    };
    if (jobDetails.Client.type === 'individual') {
      clientDetails.firstName = jobDetails.Client.firstName;
      clientDetails.lastName = jobDetails.Client.lastName;
    } else {
      clientDetails.companyName = jobDetails.Client.companyName;
    }

    const formattedJobDetails = {
      ...jobDetails.get({ plain: true }),
      applicationDeadline: formatDateToInput(jobDetails.applicationDeadline),
      workDeadline: formatDateToInput(jobDetails.workDeadline),
      updatedAt: formatDate(jobDetails.updatedAt)
    };
  
    return {
      jobDetails: formattedJobDetails,
      client: clientDetails
    };
  } catch (error) {
    throw new Error(error.message);
  }
}
export { createJobAd, fetchAllJobSummaryDataByClientId, fetchAllJobsSummaries, fetchPostedJobDetailDataByClientId, updatePostedJobAdDataByClientId, deletePostedJobAdByClientIdAndJobId, updateJobAdStatus, fetchJobDetailsWithClientData }