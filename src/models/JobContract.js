import { DataTypes } from "sequelize";
import sequelize from "../db/connection.js";

const JobContract = sequelize.define(
  "JobContract",
  {
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "pending", // or 'completed', "finished".
    },
    contract: {
      type: DataTypes.BLOB,
      allowNull: true,
    },
    clientSignature: {
      type: DataTypes.BLOB,
      allowNull: true,
    },
    serviceProviderSignature: {
      type: DataTypes.BLOB,
      allowNull: true,
    },
    jobAdId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      references: {
        model: "JobAds",
        key: "id",
      },
    },
    priceId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    productId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    }, 
);

export default JobContract;
