import { DataTypes } from 'sequelize';
import sequelize from '../db/connection.js';

const ServiceProvider = sequelize.define(
    'ServiceProvider',
    {
        firstName: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        lastName: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        gender: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        dateOfBirth: {
            type: DataTypes.DATEONLY,
            allowNull: false,
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
            allowNull: false,
        },
        documentNumber: {
            type: DataTypes.STRING,
            allowNull: false,
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
        aboutMeSummary: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        skills: {
            type: DataTypes.JSON,
            allowNull: true,
        },
        role: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: 'service provider',
        },
        profileImage: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: '',
        }
    });

export default ServiceProvider;
