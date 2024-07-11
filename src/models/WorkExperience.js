import { DataTypes } from 'sequelize';
import sequelize from '../db/connection.js';

const WorkExperience = sequelize.define('WorkExperience', {
    companyName: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    jobTitle: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    startDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    endDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    serviceProviderId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'ServiceProviders',
            key: 'id',
        },
    },
}, {
    tableName: 'WorkExperiences',
  }, {
    timestamps: false,
});

export default WorkExperience;
