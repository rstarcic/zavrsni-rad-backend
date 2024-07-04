import { DataTypes } from 'sequelize';
import sequelize from '../db/connection.js';

const WorkExperience = sequelize.define('WorkExperience', {
    companyName: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    jobTitle: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    startDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
    },
    endDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
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
