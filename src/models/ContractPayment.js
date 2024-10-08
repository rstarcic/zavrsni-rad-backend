import { DataTypes } from "sequelize";
import sequelize from "../db/connection.js";

const ContractPayment = sequelize.define(
  "ContractPayment",
  {
    jobContractId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "JobContracts",
        key: "id",
      },
    },
    invoiceId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    invoicePdf: {
      type: DataTypes.BLOB,
      allowNull: true,
    },
    sessionId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "ContractPayments",
    timestamps: true,
  }
);

export default ContractPayment;
