import JobAd from "../models/JobAd.js";
import Client from "../models/Client.js";
import JobVacancy from "../models/JobVacancy.js";
import ServiceProvider from "../models/ServiceProvider.js";
import { Op } from 'sequelize';

function formatDateToMMDDYYYYHHMM(dateString) {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0'); 
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${month}/${day}/${year} ${hours}:${minutes}`;
}

function formatDateToInput(dateString) {
  const d = new Date(dateString);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0'); 
  const year = d.getFullYear();

  return `${month}/${day}/${year}`;
}

async function createJobAd(jobAdData, clientId) {
  try {
    const newCreatedJob = await JobAd.create({
      ...jobAdData,
      clientId: clientId,
    });
    return newCreatedJob;
  } catch (error) {
    throw new Error(error.message);
  }
}

async function fetchAllJobSummaryDataByClientId(clientId) {
  try {
    const jobs = await JobAd.findAll({
      where: { clientId: clientId },
      attributes: ["id", "title", "category", "status", "createdAt"],
    });
    const formattedJobs = jobs.map((job) => {
      return {
        ...job.get({ plain: true }),
        createdAt: formatDateToMMDDYYYYHHMM(job.createdAt),
      };
    });
    console.log("Formatted jobs_", formattedJobs);
    return formattedJobs;
  } catch (error) {
    throw new Error(error.message);
  }
}

async function fetchAllJobsSummaries() {
  try {
    const jobs = await JobAd.findAll({
      where: { status: "active" },
      attributes: ["id", "title", "category", "hourlyRate", "paymentCurrency", "location", "contactInfo"],
      order: [["createdAt", "DESC"]],
    });
    const plainJobs = jobs.map((job) => job.get({ plain: true }));
    console.log(plainJobs);
    return plainJobs;
  } catch (error) {
    throw new Error(error.message);
  }
}

async function fetchPostedJobDetailDataByClientId(clientId, jobId) {
  try {
    const job = await JobAd.findOne({
      where: { clientId: clientId, id: jobId },
    });
    const formattedJob = {
      ...job.get({ plain: true }),
      createdAt: formatDateToMMDDYYYYHHMM(job.createdAt),
      updatedAt: formatDateToMMDDYYYYHHMM(job.updatedAt),
      workDeadline: formatDateToInput(job.workDeadline),
      applicationDeadline: formatDateToInput(job.applicationDeadline),
    };
    console.log("Formatted job", formattedJob);
    return formattedJob;
  } catch (error) {
    throw new Error(error.message);
  }
}

async function updatePostedJobAdDataByClientId(clientId, jobId, dataToUpdate) {
  try {
    const job = await JobAd.findOne({
      where: { clientId: clientId, id: jobId },
    });

    await job.update(dataToUpdate);

    const formattedJob = {
      ...job.get({ plain: true }),
      createdAt: formatDateToMMDDYYYYHHMM(job.createdAt),
      updatedAt: formatDateToMMDDYYYYHHMM(job.updatedAt),
      workDeadline: formatDateToInput(job.workDeadline),
      applicationDeadline: formatDateToInput(job.applicationDeadline),
    };
    console.log("Formatted job", formattedJob);
    return formattedJob;
  } catch (error) {
    throw new Error(error.message);
  }
}

async function deletePostedJobAdByClientIdAndJobId(clientId, jobId) {
  try {
    const job = await JobAd.destroy({
      where: { clientId: clientId, id: jobId },
    });

    console.log("Job deleted", job);
    return job;
  } catch (error) {
    throw new Error(error.message);
  }
}

async function updateJobAdStatus(clientId, jobId, status) {
  try {
    const job = await JobAd.findOne({
      where: { clientId: clientId, id: jobId },
    });
    const newStatus = status === "active" ? "inactive" : "active";
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
        attributes: ["id", "firstName", "lastName", "companyName", "profileImage", "imageType", "type"],
      },
    });
    if (!jobDetails) {
      throw new Error("Job not found");
    }
    const clientDetails = {
      id: jobDetails.Client.id,
      profileImage: jobDetails.Client.profileImage,
      imageType: jobDetails.Client.imageType,
      type: jobDetails.Client.type,
    };
    if (jobDetails.Client.type === "individual") {
      clientDetails.firstName = jobDetails.Client.firstName;
      clientDetails.lastName = jobDetails.Client.lastName;
    } else {
      clientDetails.companyName = jobDetails.Client.companyName;
    }

    const formattedJobDetails = {
      ...jobDetails.get({ plain: true }),
      applicationDeadline: formatDateToInput(jobDetails.applicationDeadline),
      workDeadline: formatDateToInput(jobDetails.workDeadline),
      updatedAt: formatDateToMMDDYYYYHHMM(jobDetails.updatedAt),
    };

    return {
      jobDetails: formattedJobDetails,
      client: clientDetails,
    };
  } catch (error) {
    throw new Error(error.message);
  }
}

async function applyForAJob(jobId, serviceProviderId) {
  try {
    const jobAd = await JobAd.findByPk(jobId);
    if (!jobAd) {
      throw new Error("Job advertisement not found");
    }
    const existingApplication = await JobVacancy.findOne({
      where: {
        jobAdId: jobId,
        serviceProviderId,
      },
    });

    if (existingApplication) {
      return { message: "You have already applied for this job" };
    }
    const application = await JobVacancy.create({
      jobAdId: jobId,
      serviceProviderId,
    });

    return application;
  } catch (error) {
    throw new Error(error.message);
  }
}

async function fetchAllJobAndApplicationData(serviceProviderId, status) {
  try {
    const whereCondition = { serviceProviderId, jobStatus: status}
    const applications = await JobVacancy.findAll({
      where: whereCondition,
      attributes: ["id", "jobStatus", "applicationStatus", "appliedAt"],
      include: [
        {
          model: JobAd,
          attributes: ["id", "title", "category", "hourlyRate", "paymentCurrency", "location", "duration", "contactInfo"],
          include: [
            {
              model: Client,
              attributes: ["id", "firstName", "lastName", "companyName", "type"],
            },
          ],
        },
      ],
      order: [["appliedAt", "ASC"]],
    });

    applications.forEach(application => {
      application.setDataValue('appliedAt', formatDateToMMDDYYYYHHMM(application.appliedAt));
      console.log(application.appliedAt);
    });
    
    return applications;
  } catch (error) {
    throw new Error(error.message);
  }
}

async function fetchBasicCandidatesInfoForJob(jobId) {
  try {
    const jobAd = await JobAd.findByPk(jobId, {
      include: [
        {
          model: JobVacancy,
          attributes:["applicationStatus", "jobStatus"],
          include: [
            {
              model: ServiceProvider,
              attributes: ["id", "firstName", "lastName", "phoneNumber", "country", "city", "address", "email", "profileImage", "imageType"],
            },
          ],
        },
      ],
    });
    const candidates = jobAd.JobVacancies.map(vacancy => ({
      serviceProvider: vacancy.ServiceProvider,
      applicationStatus: vacancy.applicationStatus,
      jobStatus: vacancy.jobStatus
    }));
    console.log(candidates)
    return candidates;
  } catch (error) {
    throw new Error(error.message);
  }
}

async function fetchJobsSummariesForHomePage(limit) {
  try {
    const jobs = await JobAd.findAll({
      where: { status: "active" },
      attributes: ["id", "title", "category", "hourlyRate", "paymentCurrency", "location", "contactInfo"],
      order: [["createdAt", "DESC"]],
      limit: limit,
    });
    const plainJobs = jobs.map((job) => job.get({ plain: true }));
    console.log(plainJobs);
    return plainJobs;
  } catch (error) {
    throw new Error(error.message);
  }
}

async function fetchAllFilteredJobs(filters) {
  try {
    let orConditions = []; 

    if (filters.titles) {
      orConditions.push({
        title: Array.isArray(filters.titles) ? { [Op.in]: filters.titles } : filters.titles
      });
    }

    if (filters.categories) {
      orConditions.push({
        category: Array.isArray(filters.categories) ? { [Op.in]: filters.categories } : filters.categories
      });
    }

    if (filters.locations) {
      orConditions.push({
        location: Array.isArray(filters.locations) ? { [Op.in]: filters.locations } : filters.locations
      });
    }
   
    if (filters.minHourlyRate || filters.maxHourlyRate) {
      const hourlyRateCondition = {};
      if (filters.minHourlyRate) hourlyRateCondition[Op.gte] = Number(filters.minHourlyRate);
      if (filters.maxHourlyRate) hourlyRateCondition[Op.lte] = Number(filters.maxHourlyRate);
      orConditions.push({ hourlyRate: hourlyRateCondition });
    }

    const where = orConditions.length > 0 ? { [Op.or]: orConditions } : {};
    const jobs = await JobAd.findAll({
      where: where,
      attributes: ["id", "title", "category", "hourlyRate", "paymentCurrency", "location", "contactInfo"],
      order: [["createdAt", "DESC"]],
    });

    console.log("Filtered Jobs: ", jobs.map(job => job.get({ plain: true })));
    return jobs.map(job => job.get({ plain: true }));
  } catch (error) {
    console.error('Error in fetchAllFilteredJobs:', error);
    throw new Error('Failed to fetch jobs due to server error.');
  }
}

async function fetchApplicationStatus(jobAdId, serviceProviderId) {
  try {
    const job = await JobVacancy.findOne({
    where: { jobAdId, serviceProviderId},
    });
  return job.applicationStatus;
} catch (error) {
  throw new Error(error.message);
}
}

async function updateVacancyJobStatus(serviceProviderId, jobAdId) {
  try {
    const vacancyJobStatus = await JobVacancy.findOne({
      where: {
        jobAdId: jobAdId,
        serviceProviderId: serviceProviderId
      }
    });

    if (!vacancyJobStatus) {
      console.log('Job vacancy not found.');
      return false;
    }

    await vacancyJobStatus.update({ jobStatus: 'completed' });
    console.log('Job status updated to completed');
    return true;
  }
  catch (error) {
    console.error(`Error updating job status: ${error.message}`);
    return false;
  }
}

async function updateJobVacanciesWithStripeAccountId(serviceProviderId, jobAdId, stripeAccountId) {
  try {
    const vacancy = await JobVacancy.findOne({ where: { serviceProviderId, jobAdId } })
    if (!vacancy) {
      throw new Error('Service provider not found');
    }
    vacancy.serviceProviderStripeAccountId  = stripeAccountId;
    await vacancy.save(); 
    return true;
  } catch (error) {
    throw new Error(error.message);
  }
}

export {
  createJobAd,
  fetchAllJobSummaryDataByClientId,
  fetchAllJobsSummaries,
  fetchPostedJobDetailDataByClientId,
  updatePostedJobAdDataByClientId,
  deletePostedJobAdByClientIdAndJobId,
  updateJobAdStatus,
  fetchJobDetailsWithClientData,
  applyForAJob,
  fetchAllJobAndApplicationData,
  fetchBasicCandidatesInfoForJob,
  fetchJobsSummariesForHomePage,
  fetchAllFilteredJobs,
  fetchApplicationStatus,
  updateVacancyJobStatus,
  updateJobVacanciesWithStripeAccountId
};
