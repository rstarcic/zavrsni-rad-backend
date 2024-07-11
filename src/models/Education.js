import { DataTypes } from 'sequelize';
import sequelize from '../db/connection.js';

const Education = sequelize.define('Education', {
    institution: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    degree: {
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
    tableName: "Education",
    timestamps: false,
});

export default Education;
