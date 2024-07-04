import { DataTypes } from 'sequelize';
import sequelize from '../db/connection.js';

const Education = sequelize.define('Education', {
    institution: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    degree: {
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
    tableName: "Education",
    timestamps: false,
});

export default Education;
