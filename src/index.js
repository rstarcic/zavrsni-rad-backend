import express from "express";
import cors from "cors";
import { syncModels } from "./models/index.js";
import { registerUser } from "./handlers/registerUser.js";
import { checkCredentials } from "./handlers/loginUser.js";
import ServiceProvider from "./models/ServiceProvider.js";
import Client from "./models/Client.js";
import jwt from "jsonwebtoken";
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

/*
async function getBusinessClients() {
  try {
    const businessClients = await Client.scope("business").findAll();
    console.log(businessClients);
    return businessClients;
  } catch (error) {
    console.error("Error fetching business clients:", error);
    throw new Error("Error fetching business clients");
  }
}

getBusinessClients();

async function getBusinessClientById(clientId) {
  try {
    const businessClient = await Client.scope("business").findByPk(clientId);
    console.log(businessClient);
    return businessClient;
  } catch (error) {
    console.error("Error fetching business client:", error);
    throw new Error("Error fetching business client");
  }
}

getBusinessClientById(1); // Pretpostavljajući da je ID klijenta 2

async function geIndividualClients() {
  try {
    const businessClients = await Client.scope("individual").findAll();
    console.log(businessClients);
    return businessClients;
  } catch (error) {
    console.error("Error fetching business clients:", error);
    throw new Error("Error fetching business clients");
  }
}

geIndividualClients();

async function getIndividualClientById(clientId) {
  try {
    const businessClient = await Client.scope("individual").findByPk(clientId);
    console.log(businessClient);
    return businessClient;
  } catch (error) {
    console.error("Error fetching business client:", error);
    throw new Error("Error fetching business client");
  }
}

getIndividualClientById(2);

*/
syncModels().then(() => {
  app.listen(port, () => {
    console.log(`Service is running on http://localhost:${port}`);
  });
});
