import express from "express";
import cors from "cors";
import { syncModels } from "./models/index.js";
import { registerUser } from "./handlers/registerUser.js";
import { checkCredentials, generateToken } from "./handlers/loginUser.js";
import {
  updateServiceProviderDataByUserId,
  fetchServiceProviderProfileImage,
  updateClientDataByUserId,
  fetchClientProfileImage,
  decodeBase64Image,
  encodeBase64Image,
} from "./handlers/profileHandler.js";
import { updateOrCreateEducation, fetchEducationByUserId } from "./handlers/educationHandler.js";
import { updateOrCreateWorkExperience, fetchWorkExperienceByUserId } from "./handlers/workExperienceHandler.js";
import { updateOrCreateLanguage, fetchLanguagesByUserId } from "./handlers/languageHandler.js";
import { fetchClientDataById, fetchServiceProviderById, fetchServiceProviderRoleById, fetchClientRoleAndTypeById, fetchBankDetailsDataByServiceProviderId, updateBankDetailsDataByServiceProviderId } from "./handlers/userHandler.js";
import { checkCurrentAndUpdateNewPassword, deleteAccount, deactivateAccount, reactivateAccont } from "./handlers/accountHandler.js";
import {
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
  fetchApplicationStatus
} from "./handlers/jobAdHandler.js";
import { fetchClientDataForContract, fetchAllDataForContract, generateClientContract, generateServiceProviderContract, saveClientSignatureToDatabase, fetchContractByJobAdId, isContractSigned, fetchClientContracts, fetchContractByContractId } from "./handlers/contractHandler.js";
import ServiceProvider from "./models/ServiceProvider.js";
import Client from "./models/Client.js";
import { authenticateToken } from "./middlewares/authMiddleware.js";
import dotenv from "dotenv";
import { Console } from "console";
dotenv.config({ path: "../.env" });

const app = express();
const router = express.Router();
const port = process.env.PORT || 3001;

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

const corsOptions = {
  origin: "http://localhost:8080" || "*",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  exposedHeaders: ["Authorization"],
  credentials: true,
};

app.use(cors(corsOptions));
app.options("*", cors());
app.use("/api", router);
app.use(authenticateToken);

app.use((req, res, next) => {
  console.log("Authorization Header:", req.headers.authorization);
  next();
});

router.route("/").get((req, res) => {
  res.send("Welcome to the Jobify home page!");
});

router.route("/auth/signup/service-provider").post(async (req, res) => {
  try {
    const userData = req.body;
    const serviceProvider = await registerUser(userData, ServiceProvider);

    if (serviceProvider) {
      console.log("Service provider auth signup : ", serviceProvider);
      const token = generateToken(serviceProvider);
      res.setHeader("Authorization", `Bearer ${token}`);
      return res.status(201).json({
        message: "Service provider registered successfully",
        token,
        role: userData.role,
        user: serviceProvider,
      });
    } else {
      return res.status(400).json({ message: "Service provider registration failed" });
    }
  } catch (error) {
    console.error("Error registering service provider/job seeker:", error.message);
    if (error.message.includes("User with this email already exists")) {
      return res.status(409).json({ message: error.message });
    }
    return res.status(500).send("Error registering service provider/job seeker: " + error.message);
  }
});

router.route("/auth/signup/client").post(async (req, res) => {
  try {
    const userData = req.body;
    console.log(userData);
    if (userData.type === "individual") {
      if (!userData.dateOfBirth) {
        return res.status(400).json({ error: "Date of birth is required for individual clients." });
      }
      userData.companyName = null;
      userData.VATnumber = null;
    }
    if (userData.type === "business") {
      userData.firstName = null;
      userData.lastName = null;
      userData.gender = null;
      userData.dateOfBirth = null;
      userData.documentType = null;
      userData.documentNumber = null;
    }

    const client = await registerUser(userData, Client);
    console.log("client auth signup : ", client);
    if (client) {
      const token = generateToken(client);
      res.setHeader("Authorization", `Bearer ${token}`);
      return res.status(201).json({
        message: "Client/Employer registered successfully",
        token,
        role: userData.role,
        user: client,
      });
    } else {
      return res.status(400).json({ message: "Client/Employer registration failed" });
    }
  } catch (error) {
    if (error.message.includes("User with this email already exists")) {
      return res.status(409).json({ message: error.message });
    }
    console.error("Error registering client:", error.message);
    return res.status(500).send("Error registering client: " + error.message);
  }
});

router.route("/auth/login").post(async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await checkCredentials(email, password);

    if (user) {
      if (user.error === "deactivated") {
        return res.status(403).json({
          message: user.message,
        });
      }
      if (user.profileImage !== null && user.imageType !== null) {
        const encodedImage = await encodeBase64Image(user.profileImage, user.imageType);
        user.profileImage = encodedImage;
      }
      const token = generateToken(user);
      res.setHeader("authorization", `Bearer ${token}`);
      res.status(200).json({ message: "Successfully logged in", token, user });
    } else {
      return res.status(401).json({ message: "Unauthorized" });
    }
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

router.route("/service-provider/role").get(authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const role = await fetchServiceProviderRoleById(userId);
    res.status(200).json({
      role,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send(error.message);
  }
});

router.route("/service-provider/profile").patch(authenticateToken, async (req, res) => {
  try {
    const { user, education, workExperience, language, userId } = req.body;
    if (!user || !userId) {
      return res.status(400).json({ message: "Missing user or userId in request body" });
    }

    let updatedUser;
    let updatedEducation;
    let updatedWorkExperience;
    let updatedLanguage;

    if (user) {
      if (user.profileImage) {
        const { imageBuffer, imageType } = await decodeBase64Image(user.profileImage);
        user.profileImage = imageBuffer;
        user.imageType = imageType;
      }
      updatedUser = await updateServiceProviderDataByUserId(user, userId);
    }
    if (education && education.institution && education.degree && education.startDate && education.endDate) {
      updatedEducation = await updateOrCreateEducation(userId, education);
    }
    if (workExperience && workExperience.companyName && workExperience.jobTitle && workExperience.startDate && workExperience.endDate) {
      updatedWorkExperience = await updateOrCreateWorkExperience(userId, workExperience);
    }
    if (language) {
      updatedLanguage = await updateOrCreateLanguage(userId, language);
    }
    if (updatedUser && updatedUser.profileImage && updatedUser.imageType) {
      updatedUser.profileImage = await encodeBase64Image(updatedUser.profileImage, updatedUser.imageType);
    }

    res.status(200).send({
      message: "Profile updated successfully",
      user: updatedUser,
      education: updatedEducation,
      workExperience: updatedWorkExperience,
      language: updatedLanguage,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      success: false,
      message: "Internal server error. Failed to update profile.",
    });
  }
});

router.route("/service-provider/data").get(authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await fetchServiceProviderById(userId);
    if (user.profileImage !== null && user.imageType !== null) {
      const encodedImage = await encodeBase64Image(user.profileImage, user.imageType);
      user.profileImage = encodedImage;
    }
    const education = await fetchEducationByUserId(userId);
    const workExperience = await fetchWorkExperienceByUserId(userId);
    const languages = await fetchLanguagesByUserId(userId);
    res.status(200).json({
      user,
      education,
      workExperience,
      languages,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send(error.message);
  }
});

router.route("/service-provider/photo/:userId").get(authenticateToken, async (req, res) => {
  try {
    const userImage = await fetchServiceProviderProfileImage(req.params.userId);
    if (!userImage) {
      return res.status(404).send("Photo not found.");
    } else {
      const encodedImage = await encodeBase64Image(userImage.profileImage, userImage.imageType);
      res.json({ encodedImage });
    }
  } catch (error) {
    console.error("Error fetching user image:", error);
    return res.status(500).send("Error fetching photo.");
  }
});

router.route("/service-provider/account/password").patch(authenticateToken, async (req, res) => {
  const { userId, currentPassword, newPassword, confirmedPassword } = req.body;
  console.log("req.body", req.body);
  if (newPassword !== confirmedPassword) {
    return res.status(400).send({ message: "Passwords do not match." });
  }
  if (newPassword === currentPassword) {
    return res.status(400).send({ message: "Cannot update password with same password." });
  }
  const passwordUpdated = await checkCurrentAndUpdateNewPassword("ServiceProvider", userId, currentPassword, newPassword);
  if (passwordUpdated) {
    return res.status(201).send({ message: "Password updated successfully." });
  }
});

router.route("/service-provider/account").delete(authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const model = req.user.role === "service provider" ? "ServiceProvider" : "Client";
  const result = await deleteAccount(model, userId);
  if (result.success) {
    return res.status(200).send({ message: result.message });
  } else {
    return res.status(500).send({ message: result.message });
  }
});

router.route("/service-provider/account/deactivate").patch(authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  console.log(userId);
  const model = req.user.role === "service provider" ? "ServiceProvider" : "Client";
  const result = await deactivateAccount(model, userId);
  if (result.success) {
    return res.status(202).send({ message: result.message });
  } else {
    return res.status(500).send({ message: result.message });
  }
});

router.get('/service-provider/jobs/bank-details', authenticateToken, async (req, res) => {
  try {
    const serviceProviderId = req.user.userId;
    const hasBankDetails = await fetchBankDetailsDataByServiceProviderId(serviceProviderId);
    if (hasBankDetails === true) {
      res.json({ hasBankDetails });
    } else if(hasBankDetails === false) {
      res.json({ hasBankDetails });
    }
    else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send(error.message);
  }
})
.patch('/service-provider/jobs/bank-details', authenticateToken, async (req, res) => {
  try {
    const serviceProviderId = req.user.userId;
    const { iban, bankName } = req.body;
    const successfulUpdate = await updateBankDetailsDataByServiceProviderId(serviceProviderId, iban, bankName);
    if (successfulUpdate) {
      res.json({ successfulUpdate });
    } else if(successfulUpdate === false) {
      res.json({ successfulUpdate });
    }
    else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send(error.message);
  }
});
// fetch job details with client data
router.route("/service-provider/jobs/:jobId").get(authenticateToken, async (req, res) => {
  try {
    console.log( req.params.jobId)
    const jobId = req.params.jobId;
    const { jobDetails, client } = await fetchJobDetailsWithClientData(jobId);
    console.log(jobDetails);
    console.log(client);
    client.profileImage = jobDetails.Client.profileImage;
    client.imageType = jobDetails.Client.imageType;
    if (client.profileImage !== null && client.imageType !== null) {
      const clientEncodedImage = await encodeBase64Image(client.profileImage, client.imageType);
      client.profileImage = clientEncodedImage;
    }
    console.log("jobDetails.client.profileImage", client.profileImage);
    res.status(200).json({
      job: jobDetails,
      client,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send(error.message);
  }
});

router.route("/service-provider/jobs/:jobId/applications").post(authenticateToken, async (req, res) => {
  try {
    const jobId = parseInt(req.params.jobId);
    const serviceProviderId = req.user.userId;
    const application = await applyForAJob(jobId, serviceProviderId);

    if (application.message) {
      return res.status(401).json({ message: application.message });
    }

    console.log("Application created:", application);
    res.status(201).json({ message: "Applied successfully", application });
  } catch (error) {
    console.error("Error applying for job:", error.message);
    res.status(404).send({ error: `Failed to apply for job: ${error.message}` });
  }
});

router.route("/service-provider/jobs/:jobId/generate").get(authenticateToken, async (req, res) => {
  try {
    const jobId = parseInt(req.params.jobId);
    const jobContract = await fetchContractByJobAdId(jobId);
    if (jobContract) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline; filename="contract.pdf"');
      res.send(jobContract);
    }
  } catch (error) {
    console.error("Error fetching job contract:", error.message);
    res.status(404).send({ error: `Failed to fetch contract: ${error.message}` });
  }
});


router.route("/service-provider/jobs/:jobId/client/:clientId/generate").post(authenticateToken, async (req, res) => {
  const jobId = req.params.jobId;
  const clientId = req.params.clientId;
  const serviceProviderId = req.user.userId;
  const { signature } = req.body;
  try {
    const contractData = await fetchAllDataForContract(jobId, serviceProviderId, clientId);
    console.log(contractData);
    await generateServiceProviderContract(res, signature, contractData);
  } catch (error) {
    console.error("Error fetching data for contract:", error);
    res.status(400).send({ error: "Failed to fetch data for contract" });
  }
});

router.route("/service-provider/jobs/:jobId/contract/signed").get(authenticateToken, async (req, res) => {
  try {
    const jobId = parseInt(req.params.jobId);
    const isContractSignedByServiceProvider = await isContractSigned(jobId, "serviceProviderSignature");
    const signed = isContractSignedByServiceProvider ? true : false;
    res.status(202).send({ message: `Contract is already signed by service provider`, signed });
  } catch (error) {
    console.error("Error fetching job contract:", error.message);
    res.status(404).send({ error: `Failed to fetch contract: ${error.message}` });
  }
});

router.route("/service-provider/applications").get(authenticateToken, async (req, res) => {
  try {
    const serviceProviderId = req.user.userId;
    const applications = await fetchAllJobAndApplicationData(serviceProviderId);

    console.log("Applications and job data fetched:", applications);
    res.status(200).json({ message: "Applied successfully", applications });
  } catch (error) {
    console.error("Error fetching applications and job data:", error.message);
    res.status(404).send({ error: `Failed to fetch applications and job data: ${error.message}` });
  }
});

router.get('/service-provider/client/:clientId', authenticateToken, async (req, res) => {
  try {
    const user = await fetchClientDataById(req.params.clientId);
    if (user) {
      const encodedImage = await encodeBase64Image(user.profileImage, user.imageType);
      user.profileImage = encodedImage;
      console.log(user.profileImage);
      res.status(200).json({ message: "User data successfully fetched", user });
    } else {
      res.status(404).send("User not found");
    }
  } catch (error) {
    console.error(error);
    res.status(500).send(error.message);
  }
});

router.route("/account/reactivate").patch(async (req, res) => {
  const { email, password } = req.body;
  const accountReactivated = await reactivateAccont(email, password);
  if (accountReactivated.success) {
    const token = generateToken(accountReactivated.user);
    return res.status(202).send({ message: "Account reactivated successfully.", token, user: accountReactivated.user });
  } else {
    return res.status(500).send({ message: "Account reactivation failed." });
  }
});

router.route("/client/data").get(authenticateToken, async (req, res) => {
  try {
    const userDataFetched = await fetchClientDataById(req.user.userId);
    if (userDataFetched) {
      const encodedImage = await encodeBase64Image(userDataFetched.profileImage, userDataFetched.imageType);
      userDataFetched.profileImage = encodedImage;
      console.log(userDataFetched.profileImage);
      res.status(200).json({ message: "User data successfully fetched", userDataFetched });
    } else {
      res.status(404).send("User not found");
    }
  } catch (error) {
    console.error(error);
    res.status(500).send(error.message);
  }
});

router.route("/client/role").get(authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    console.log(userId);
    const user = await fetchClientRoleAndTypeById(userId);
    res.status(200).json(user);
  } catch (error) {
    console.error(error);
    res.status(500).send(error.message);
  }
});

router.route("/client/photo/:userId").get(authenticateToken, async (req, res) => {
  try {
    const userImage = await fetchClientProfileImage(req.params.userId);
    if (!userImage) {
      return res.status(404).send("Photo not found.");
    } else {
      const encodedImage = await encodeBase64Image(userImage.profileImage, userImage.imageType);
      res.json({ encodedImage });
    }
  } catch (error) {
    console.error("Error fetching user image:", error);
    return res.status(500).send("Error fetching photo.");
  }
});

router.route("/client/profile").patch(authenticateToken, async (req, res) => {
  try {
    const { user, userId } = req.body;
    if (user.profileImage) {
      const { imageBuffer, imageType } = await decodeBase64Image(user.profileImage);
      user.profileImage = imageBuffer;
      user.imageType = imageType;
    }
    const userDataUpdated = await updateClientDataByUserId(user, userId);
    if (userDataUpdated) {
      const encodedImage = await encodeBase64Image(userDataUpdated.profileImage, userDataUpdated.imageType);
      userDataUpdated.profileImage = encodedImage;
      console.log(userDataUpdated.profileImage);
      res.status(200).send({ message: "Profile updated successfully", userDataUpdated });
    } else {
      res.status(400).send({ message: "Failed to update profile." });
    }
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error. Failed to update client profile.",
    });
  }
});

router.route("/client/account/password").patch(authenticateToken, async (req, res) => {
  const { userId, currentPassword, newPassword, confirmedPassword } = req.body;
  console.log("req.body", req.body);
  if (newPassword !== confirmedPassword) {
    return res.status(400).send({ message: "Passwords do not match." });
  }
  if (newPassword === currentPassword) {
    return res.status(400).send({ message: "Cannot update password with same password." });
  }
  const passwordUpdated = await checkCurrentAndUpdateNewPassword("Client", userId, currentPassword, newPassword);
  if (passwordUpdated) {
    return res.status(201).send({ message: "Password updated successfully." });
  }
});

router.route("/client/account").delete(authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const model = req.user.role === "service provider" ? "ServiceProvider" : "Client";
  const result = await deleteAccount(model, userId);
  if (result.success) {
    return res.status(200).send({ message: result.message });
  } else {
    return res.status(500).send({ message: result.message });
  }
});

router.route("/client/account/deactivate").patch(authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  console.log(userId);
  const model = req.user.role === "service provider" ? "ServiceProvider" : "Client";
  const result = await deactivateAccount(model, userId);
  if (result.success) {
    return res.status(202).send({ message: result.message });
  } else {
    return res.status(500).send({ message: result.message });
  }
});

router.route("/client/jobs").post(authenticateToken, async (req, res) => {
  const jobAdData = req.body;
  const clientId = req.user.userId;
  try {
    const jobCreated = await createJobAd(jobAdData, clientId);
    console.log("Job created:", jobCreated);
    res.status(201).send({ message: "Job created successfully", jobCreated });
  } catch (error) {
    console.error("Error creating job:", error);
    res.status(400).send({ error: "Failed to create job ad" });
  }
});

router.route("/client/jobs/created").get(authenticateToken, async (req, res) => {
  const clientId = req.user.userId;
  try {
    const jobsFetched = await fetchAllJobSummaryDataByClientId(clientId);
    console.log("Jobs fetched:", jobsFetched);
    res.status(201).send({ message: "Job fetched successfully", jobs: jobsFetched });
  } catch (error) {
    console.error("Error creating job:", error);
    res.status(400).send({ error: "Failed to create job ad" });
  }
});

router
  .route("/client/jobs/:jobId/detail")
  .get(authenticateToken, async (req, res) => {
    const clientId = req.user.userId;
    const jobId = parseInt(req.params.jobId);
    try {
      const jobFetched = await fetchPostedJobDetailDataByClientId(clientId, jobId);
      console.log("Job fetched:", jobFetched);
      res.status(200).send({ message: "Job fetched successfully", job: jobFetched });
    } catch (error) {
      console.error("Error fetching job:", error);
      res.status(400).send({ error: "Failed to fecth job ad" });
    }
  })
  .patch(authenticateToken, async (req, res) => {
    const clientId = req.user.userId;
    const jobId = parseInt(req.params.jobId);
    const dataToUpdate = req.body;
    try {
      const jobsUpdated = await updatePostedJobAdDataByClientId(clientId, jobId, dataToUpdate);
      console.log("Job updated:", jobsUpdated);
      res.status(200).send({ message: "Job updated successfully!", jobs: jobsUpdated });
    } catch (error) {
      console.error("Error updating job:", error);
      res.status(400).send({ error: "Failed to update job ad" });
    }
  })
  .delete(authenticateToken, async (req, res) => {
    const clientId = req.user.userId;
    const jobId = parseInt(req.params.jobId);
    try {
      const jobDeleted = await deletePostedJobAdByClientIdAndJobId(clientId, jobId);
      console.log("Job deleted:", jobDeleted);
      res.status(200).send({ message: "Job deleted successfully" });
    } catch (error) {
      console.error("Error creating job:", error);
      res.status(400).send({ error: "Failed to delete job ad" });
    }
  });

router.route("/client/jobs/:jobId/status").patch(authenticateToken, async (req, res) => {
  const clientId = req.user.userId;
  const jobId = parseInt(req.params.jobId);
  const { status } = req.body;
  try {
    const jobStatusUpdated = await updateJobAdStatus(clientId, jobId, status);
    console.log("Job status updated:", jobStatusUpdated.status);
    res.status(200).send({ message: "Job status updated successfully!", status: jobStatusUpdated.status });
  } catch (error) {
    console.error("Error updating job status:", error);
    res.status(400).send({ error: "Failed to update job ad status" });
  }
});

// fetch job details with client data that posted that job
router.route("/client/jobs/:jobId").get(authenticateToken, async (req, res) => {
  try {
    const jobId = req.params.jobId;
    const { jobDetails, client } = await fetchJobDetailsWithClientData(jobId);
    console.log(jobDetails);
    console.log(client);
    client.profileImage = jobDetails.Client.profileImage;
    client.imageType = jobDetails.Client.imageType;
    if (client.profileImage !== null && client.imageType !== null) {
      const clientEncodedImage = await encodeBase64Image(client.profileImage, client.imageType);
      client.profileImage = clientEncodedImage;
    }
    res.status(200).json({
      job: jobDetails,
      client,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send(error.message);
  }
});

router.route("/client/jobs/:jobId/candidates").get(authenticateToken, async (req, res) => {
  try {
    const jobId = req.params.jobId;
    const candidates = await fetchBasicCandidatesInfoForJob(jobId);
    console.log(candidates);
    for (let candidate of candidates) {
      if (candidate.serviceProvider.profileImage !== null && candidate.serviceProvider.imageType !== null) {
        candidate.serviceProvider.profileImage = await encodeBase64Image(candidate.serviceProvider.profileImage, candidate.serviceProvider.imageType);
      }
    }
    res.status(200).json({
    candidates
    });
  } catch (error) {
    console.error(error);
    res.status(500).send(error.message);
  }
});

router.get('/client/candidates/:candidateId', authenticateToken, async (req, res) => {
  try {
    const serviceProviderId = req.params.candidateId;
    const user = await fetchServiceProviderById(serviceProviderId);

    if (!user) {
      return res.status(404).json({ message: 'Service provider not found' });
    }

    if (user.profileImage && user.imageType) {
      const encodedImage = await encodeBase64Image(user.profileImage, user.imageType);
      user.profileImage = encodedImage;
    }

    const education = await fetchEducationByUserId(serviceProviderId);
    const workExperience = await fetchWorkExperienceByUserId(serviceProviderId);
    const languages = await fetchLanguagesByUserId(serviceProviderId);

    res.status(200).json({
      user,
      education,
      workExperience,
      languages,
    });
  } catch (error) {
    console.error('Error fetching service provider data:', error);
    res.status(500).send(error.message);
  }
});

router.route("/client/jobs/:jobId/candidates/:candidateId/generate").post(authenticateToken, async (req, res) => {
  const jobId = req.params.jobId;
  const serviceProviderId = req.params.candidateId;
  const clientId = req.user.userId;
  const { signature } = req.body;
  try {
   await saveClientSignatureToDatabase(signature, jobId)
    const contractData = await fetchClientDataForContract(jobId, serviceProviderId, clientId);
    console.log(contractData);
    await generateClientContract(res, signature, contractData);
  } catch (error) {
    console.error("Error fetching data for contract:", error);
    res.status(400).send({ error: "Failed to fetch data for contract" });
  }
}); 

router.route("/client/jobs/:jobId/candidates/:candidateId/application-status").get(authenticateToken, async (req, res) => {
  const jobId = req.params.jobId;
  const serviceProviderId = req.params.candidateId;
  try {
    const status = await fetchApplicationStatus(jobId, serviceProviderId);
    if (status) {
      console.log("ApplicationStatus:", status);
      return status;
    }
  } catch (error) {
    console.error("Error fetching job application status:", error);
    res.status(400).send({ error: "Failed to fetch job application status" });
  }
});


router.route("/client/contracts").get(authenticateToken, async (req, res) => {
  const clientId = req.user.userId;
  try {
    const contractsFetched = await fetchClientContracts(clientId);
    console.log("Contracts fetched:", contractsFetched);
    res.status(200).send({ message: "Client contracts fetched successfully", contracts: contractsFetched });
  } catch (error) {
    console.error("Error fetching contracts:", error);
    res.status(400).send({ error: "Failed to fetch client contracts" });
  }
});

router.route("/client/contracts/:contractId/download").get(authenticateToken, async (req, res) => {
const contractId = req.params?.contractId
  try {
    const contract = await fetchContractByContractId(contractId);
    if (contract) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline; filename="contract.pdf"');
      res.send(contract);
    }
  } catch (error) {
    console.error("Error fetching contracts:", error);
    res.status(400).send({ error: "Failed to fetch client contracts" });
  }
});

router.get('/client/client-profile/:clientId', authenticateToken, async (req, res) => {
  try {
    const user = await fetchClientDataById(req.params.clientId);
    if (user) {
      const encodedImage = await encodeBase64Image(user.profileImage, user.imageType);
      user.profileImage = encodedImage;
      console.log(user.profileImage);
      res.status(200).json({ message: "User data successfully fetched", user });
    } else {
      res.status(404).send("User not found");
    }
  } catch (error) {
    console.error(error);
    res.status(500).send(error.message);
  }
});

router.route("/jobs/summary").get(async (req, res) => {
  try {
    console.log("Received query parameters:", req.query);
    const { titles, categories, locations, minHourlyRate, maxHourlyRate } = req.query;
    const filters = { titles, categories, locations, minHourlyRate, maxHourlyRate };

    if (titles || categories || locations || minHourlyRate || maxHourlyRate) {
      const jobsFetched = await fetchAllFilteredJobs(filters);
      console.log(jobsFetched);
      res.status(200).json({ message: "Filtered jobs fetched successfully", jobs: jobsFetched });
    } else {
      const jobsFetched = await fetchAllJobsSummaries();
      console.log(jobsFetched);
      res.status(200).json({ message: "All job summaries fetched successfully", jobs: jobsFetched });
    }
  } catch (error) {
    console.error("Error creating job:", error);
    res.status(400).send({ error: "Failed to create job ad" });
  }
});

router.route("/jobs/home").get(async (req, res) => {
  const limit = parseInt(req.query.limit, 9) || 12;
  try {
    const jobsFetched = await fetchJobsSummariesForHomePage(limit);
    console.log("Jobs summary fetched:", jobsFetched);
    res.status(201).send({ message: "Job fetched successfully", jobs: jobsFetched });
  } catch (error) {
    console.error("Error creating job:", error);
    res.status(400).send({ error: "Failed to create job ad" });
  }
});

syncModels().then(() => {
  app.listen(port, () => {
    console.log(`Service is running on http://localhost:${port}`);
  });
});
