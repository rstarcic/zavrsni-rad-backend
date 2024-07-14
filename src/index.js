import express from "express";
import cors from "cors";
import { syncModels } from "./models/index.js";
import { registerUser } from "./handlers/registerUser.js";
import { checkCredentials } from "./handlers/loginUser.js";
import { updateServiceProviderDataByUserId, fetchServiceProviderProfileImage, updateClientDataByUserId, fetchClientProfileImage } from "./handlers/profileHandler.js";
import { updateOrCreateEducation, fetchEducationByUserId } from "./handlers/educationHandler.js";
import { updateOrCreateWorkExperience, fetchWorkExperienceByUserId } from "./handlers/workExperienceHandler.js";
import { updateOrCreateLanguage, fetchLanguagesByUserId } from "./handlers/languageHandler.js";
import { fetchClientDataById, fetchServiceProviderById } from "./handlers/userHandler.js";
import ServiceProvider from "./models/ServiceProvider.js";
import Client from "./models/Client.js";
import { authenticateToken } from "./middlewares/authMiddleware.js";
import jwt from "jsonwebtoken";
import path from "path";
import { fileURLToPath } from 'url';
import multer from "multer";
import dotenv from "dotenv";
dotenv.config({ path: "../.env" });

const app = express();
const router = express.Router();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use("/api", router);


router.route("/").get((req, res) => {
  res.send("Welcome to the Jobify home page!");
});

router.route("/auth/signup/service-provider").post(async (req, res) => {
  try {
    const userData = req.body;
    //userData.role = "service provider";
    const serviceProvider = await registerUser(userData, ServiceProvider);
    if (serviceProvider) {
      console.log("Service provider auth signup : ", serviceProvider)
      const token = jwt.sign(
        { userId: serviceProvider._id, role: serviceProvider.role },
        process.env.SECRET_TOKEN,
        { expiresIn: "1h" }
      );
      res.setHeader("Authorization", `Bearer ${token}`);
      return res.status(201).json({
        message: "Service provider registered successfully",
        token,
        role: userData.role,
        user: serviceProvider,
      });
    } else {
      return res
        .status(400)
        .json({ message: "Service provider registration failed" });
    }
  } catch (error) {
    console.error(
      "Error registering service provider/job seeker:",
      error.message
    );
    return res
      .status(500)
      .send("Error registering service provider/job seeker: " + error.message);
  }
});

router.route("/auth/signup/client").post(async (req, res) => {
  try {
    const userData = req.body;
    //userData.role = "client";
    console.log(userData);
    if (userData.type === "individual") {
      if (!userData.dateOfBirth) {
        return res
          .status(400)
          .json({ error: "Date of birth is required for individual clients." });
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
    console.log("client auth signup : ", client)
    if (client) {
      const token = jwt.sign(
        { userId: client._id, role: client.role },
        process.env.SECRET_TOKEN,
        { expiresIn: "1h" }
      );
      res.setHeader("Authorization", `Bearer ${token}`);
      return res.status(201).json({
        message: "Client/Employer registered successfully",
        token,
        role: userData.role,
        user: client,
      });
    } else {
      return res
        .status(400)
        .json({ message: "Client/Employer registration failed" });
    }
  } catch (error) {
    console.error("Error registering client:", error.message);
    return res.status(500).send("Error registering client: " + error.message);
  }
});

router.route("/auth/login").post(async (req, res) => {
  try {
    const userLoginData = req.body;
    const userLoggedIn = await checkCredentials(
      userLoginData.email,
      userLoginData.password
    );
    if (userLoggedIn) {
      const payload = { userId: userLoggedIn.id, role: userLoggedIn.role };
      if (userLoggedIn.role === "client") {
        payload.type = userLoggedIn.type;
      }
      const token = jwt.sign(payload, process.env.SECRET_TOKEN, {
        expiresIn: "1h",
      });
      res.setHeader("authorization", `Bearer ${token}`);
      res
        .status(200)
        .json({ message: "Successfully logged in", token, user: userLoggedIn });
    } else {
      return res.status(401).json({ message: "Unauthorized" });
    }
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});


// multer
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
console.log("dirname",__dirname);
app.use('/public', express.static(path.join(__dirname, '..', 'public')));

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadsDir = path.join(__dirname, '..', 'public', 'users-avatar');
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5000000 
  },
  fileFilter: (req, file, callback) => {
    if (!file.originalname.match(/\.(png|jpeg|jpg)$/)) {
      return callback(new Error('Please upload a Picture (PNG, JPEG, or JPG)'));
    }
    callback(null, true);
  }
});

router.route('/service-provider/profile/upload-photo').post( upload.single('profileImage'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send({ message: 'No file uploaded.' });
    }
    const photoUrl = `public/users-avatar/${req.file.filename}`;
    res.status(200).send({ message: 'Photo uploaded successfully', photoUrl });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: 'Error uploading photo' });
  }
});

router.route('/service-provider/profile').patch(async (req, res) => {
  try {
    const { user, education, workExperience, language, userId } = req.body;
    if (!user || !userId) {
      return res.status(400).json({ message: 'Missing user or userId in request body' });
    }
    let updatedUser;
    let updatedEducation;
    let updatedWorkExperience;
    let updatedLanguage;
    if (user) {
      updatedUser = await updateServiceProviderDataByUserId(user, userId);
    }
    if (education && education.institution && education.degree && education.startDate && education.endDate) {
      updatedEducation = await updateOrCreateEducation(userId, education);
    }
    if (workExperience && workExperience.companyName && workExperience.jobTitle && workExperience.startDate && workExperience.endDate) {
      updatedWorkExperience = await updateOrCreateWorkExperience(userId, workExperience);
    }
    console.log(language)
    if (language) {
      updatedLanguage = await updateOrCreateLanguage(userId, language);
    }

    res.status(200).send({
      message: 'Profile updated successfully',
      user: updatedUser,
      education: updatedEducation,
      workExperience: updatedWorkExperience,
      language: updatedLanguage
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Internal server error. Failed to update profile.",
    });
  }
})

router.route("/service-provider/:userId").get(async (req, res) => {
  try {
    const userId = req.params.userId;
    const user = await fetchServiceProviderById(userId);
    const education = await fetchEducationByUserId(userId);
    const workExperience = await fetchWorkExperienceByUserId(userId);
    const languages = await fetchLanguagesByUserId(userId);
    res.status(200).json({
      user,
      education,
      workExperience,
      languages
    })
     } catch (error) {
    console.error(error);
    res.status(500).send(error.message);
  }
});

router.route('/service-provider/photo/:userId').get(async (req, res) => {
  try {
    const userImage = await fetchServiceProviderProfileImage(req.params.userId);
    if (!userImage) {
      return res.status(404).send('Photo not found.');
    }
    else {
      const photoUrl = user.profileImage
        ? `http://localhost:3001${user.profileImage}`
        : '';
      res.json({ photoUrl });
    }
  } catch (error) {
      console.error('Error fetching user image:', error);
      return res.status(500).send('Error fetching photo.');
    }
});


router.route('/client/profile/upload-photo').post(upload.single('profileImage'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send({ message: 'No file uploaded.' });
    }
    const photoUrl = `public/users-avatar/${req.file.filename}`;
    res.status(200).send({ message: 'Photo uploaded successfully', photoUrl });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: 'Error uploading photo' });
  }
});

router.route("/client/:userId").get(async (req, res) => {
  try {
    const userDataFetched = await fetchClientDataById(req.params.userId);
    if (userDataFetched) {
      res.status(200).json({ message: "User data successfully fetched", userDataFetched });
    } else {
      res.status(404).send("User not found");
    }
  } catch (error) {
    console.error(error);
    res.status(500).send(error.message);
  }
});

router.route('/client/photo/:userId').get(async (req, res) => {
  try {
    const userImage = await fetchClientProfileImage(req.params.userId);
    if (!userImage) {
      return res.status(404).send('Photo not found.');
    }
    else {
      const photoUrl = user.profileImage
        ? `http://localhost:3001${user.profileImage}`
        : '';
      res.json({ photoUrl });
    }
  } catch (error) {
      console.error('Error fetching user image:', error);
      return res.status(500).send('Error fetching photo.');
    }
});

router.route("/client/profile").patch(async (req, res) => {
  try {
    const { user, userId} = req.body;
    const userDataUpdated = await updateClientDataByUserId(user, userId);
    if (userDataUpdated) {
      console.log(userDataUpdated)
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



syncModels().then(() => {
  app.listen(port, () => {
    console.log(`Service is running on http://localhost:${port}`);
  });
});
