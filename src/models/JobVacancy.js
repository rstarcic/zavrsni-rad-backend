import { DataTypes } from 'sequelize';
import sequelize from '../db/connection.js';

const JobVacancy = sequelize.define('JobVacancy', {
    status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'pending', // or 'completed', "finished".
    },
    jobAdId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'JobAd',
            key: 'id',
        },
    },
    serviceProviderId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'ServiceProviders',
            key: 'id',
            },
        },
    },
    {
    tableName: 'JobVacancies',
    timestamps: false,
    });

export default JobVacancy;
