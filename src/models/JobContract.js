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
    jobAdId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "JobAds",
        key: "id",
      },
    },
    }, 
);

export default JobContract;
