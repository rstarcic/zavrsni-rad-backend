import { DataTypes } from "sequelize";
import sequelize from "../db/connection.js";
import JobAd from "./JobAd.js";

const JobContract = sequelize.define(
  "JobContract",
  {
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "pending", // or 'completed', "finished".
    },
    contractDetails: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    clientFirstName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    clientLastName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    clientAddress: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    serviceProviderFirstName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    serviceProviderLastName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    serviceProviderAddress: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    deadline: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    placeAndDate: {
      // dodati mjesto
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    paymentAmount: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    bankDetails: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    jobAdId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "JobAds",
        key: "id",
      },
    },
    }, 
  /*
  {
    hooks: {
      beforeCreate: async (jobContract) => {
        const client = await Client.findByPk(jobContract.clientId);
        if (client) {
          jobContract.clientFirstName = client.firstName;
          jobContract.clientLastName = client.lastName;
          jobContract.clientAddress = client.address;
        }

        const serviceProvider = await ServiceProvider.findByPk(
          jobContract.serviceProviderId
        );
        if (serviceProvider) {
          jobContract.serviceProviderFirstName = serviceProvider.firstName;
          jobContract.serviceProviderLastName = serviceProvider.lastName;
          jobContract.serviceProviderAddress = serviceProvider.address;
          // jobContract.bankDetails = serviceProvider.iban;
        }

        const job = await JobAd.findByPk(jobContract.jobAdId);
        if (job) {
          jobContract.contractDetails = job.description;
          jobContract.deadline = job.workDeadline;
          jobContract.paymentAmount =
            job.hourlyRate * job.workingHours * job.duration; // promijeniti - radi li se o danima, tjednima, mjesecima?
        }
      },
    }, 
  } */
);

export default JobContract;
