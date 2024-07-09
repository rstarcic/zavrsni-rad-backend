import { DataTypes } from "sequelize";
import sequelize from "../db/connection.js";

const Client = sequelize.define(
  "Client",
  {
    firstName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    gender: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    dateOfBirth: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    phoneNumber: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    country: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    city: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    address: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    postalCode: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    documentType: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    documentNumber: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    companyName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    VATnumber: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    type: {
      type: DataTypes.ENUM("individual", "business"),
      allowNull: false,
    },
    profileImage: {
      type: DataTypes.STRING,
      allowNull: true,
  },
      role: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'client',
      },
  },
  {
    scopes: {
      individual: {
        where: {
          type: "individual",
        },
        attributes: { exclude: ["companyName", "VATnumber"] },
      },
      business: {
        where: {
          type: "business",
        },
        attributes: {
          exclude: [
            "firstName",
            "lastName",
            "gender",
            "dateOfBirth",
            "documentType",
            "documentNumber",
          ],
        },
      },
    },
  }
);

export default Client;
