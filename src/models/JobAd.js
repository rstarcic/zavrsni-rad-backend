import { DataTypes } from 'sequelize';
import sequelize from '../db/connection.js';

const JobAd = sequelize.define('JobAd', {
    title: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    category: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    jobType: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "One-time",
    },
    hourlyRate: {
        type: DataTypes.FLOAT, 
        allowNull: false,
    },
    paymentCurrency: {
        type: DataTypes.STRING, 
        allowNull: false,
        defaultValue: "EUR",
    },
    paymentMethod: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "Stripe",
    },
    location: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    duration: {
        type: DataTypes.STRING, 
        allowNull: false,
    },
    workingHours: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    qualifications: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    equipmentNeeded: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    contactInfo: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    applicationDeadline: {
        type: DataTypes.DATE,
        allowNull: false,
    },
    workDeadline: {
        type: DataTypes.DATE,
        allowNull: false,
    },
    workConditions: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    status: {
        type: DataTypes.STRING, // e.g., 'active', 'inactive'
        allowNull: false,
    },
    clientId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Clients', 
            key: 'id',
        },
    },
}, {
    timestamps: true,
});

export default JobAd;
