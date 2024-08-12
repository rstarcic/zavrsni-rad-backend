import { DataTypes } from 'sequelize';
import sequelize from '../db/connection.js';

const JobVacancy = sequelize.define('JobVacancy', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
    jobStatus: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'neutral', // or 'pending', 'completed'.
    },
    applicationStatus: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'applied', // or 'selected', 'rejected', 'completed'.
    },
    jobAdId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'JobAd',
            key: 'id',
        },
    },
    serviceProviderStripeAccountId: {
        type: DataTypes.STRING,
        allowNull: true
    },
    serviceProviderId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'ServiceProviders',
            key: 'id',
            },
    },
    appliedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: DataTypes.NOW,
    }
    },
    {
    tableName: 'JobVacancies',
    timestamps: false,
    });

export default JobVacancy;
