import express from "express";
import cors from "cors";
import { syncModels } from "./models/index.js";
import { registerUser } from "./handlers/registerUser.js";
import { checkCredentials } from "./handlers/loginUser.js";
import { updateDataByUserId } from "./handlers/profileHandler.js";
import { createEducation, fetchEducation } from "./handlers/educationHandler.js";
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
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
      cb(null, 'public/uploads/')
  },
  filename: function(req, file, cb) {
      cb(null, `${Date.now()}-${file.originalname}`)
  }
});

const upload = multer({ storage: storage });

router.route('/service-provider/profile').post( upload.single('file'), async (req, res) => {
  try {
    const userId = req.body.userId;
    console.log(userId);
    const user = await ServiceProvider.findByPk(userId);
    console.log(req.body);  // Check other form data
    console.log(req.file); 
      if (user) {
          user.profileImage = `/uploads/${req.file.filename}`;
          await user.save();
          res.send({ message: 'Profile photo updated successfully', data: user });
      } else {
          res.status(404).send({ message: 'User not found' });
      }
  } catch (error) {
      console.error(error);
      res.status(500).send({ message: 'Error updating profile photo' });
  }
});

router.route('/service-provider/profile').patch(async (req, res) => {
  try {
    const userData = req.body;
    console.log(userData);
    const userDataUpdated = await updateDataByUserId(userData);
    if (userDataUpdated) {
      res.status(200).send({ message: 'Profile updated successfully', data: userDataUpdated });
    }
    else {
      res.status(400).send({ message: ' Failed to update profile.' });
    }
  }
    catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Internal server error. Failed to update profile.",
    });
  }
})

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/uploads', express.static(path.join(__dirname, './public/uploads')));

router.route('/service-provider/profile/:userId').get(async (req, res) => {
  const user = await ServiceProvider.findByPk(req.params.userId);
  if (!user || !user.profileImage) {
      return res.status(404).send('Photo not found.');
  }
  const photoUrl = user.profileImage
    ? `http://localhost:3001${user.profileImage}`
    : '';
  res.json({ photoUrl });
});


router.route('/service-provider/profile/education').post(async (req, res) => {
  try {
    const { educationList, userId } = req.body;
    const educationCreated = await createEducation(userId, educationList);
    if (educationCreated) {
      res
        .status(200)
        .json({ message: "Education added successfully", educationCreated });
    }
    else {
      res
        .status(400)
        .json({ message: "Adding education failed" });
}
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
})

router.route('/service-provider/profile/education/:userId').get(async (req, res) => {
  try {
    const { userId } = req.params;
    const educationFetched = await fetchEducation(userId);
    console.log(educationFetched);
    if (educationFetched) {
      res
        .status(200)
        .json({ message: "Education fetched successfully", educationFetched });
    }
    else {
      res
        .status(400)
        .json({ message: "Fetching education failed" });
}
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
})

syncModels().then(() => {
  app.listen(port, () => {
    console.log(`Service is running on http://localhost:${port}`);
  });
});
