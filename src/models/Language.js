import { DataTypes } from 'sequelize';
import sequelize from '../db/connection.js';

const Language = sequelize.define('Language', {
    language: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    proficiency: {
        type: DataTypes.STRING, 
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
    tableName: 'Languages',
  }, {
    timestamps: false,
});

export default Language;
