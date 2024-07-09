import Sequelize from 'sequelize';
import dotenv from 'dotenv';
import path from 'path';

const __dirname = path.resolve();
dotenv.config({ path: path.join(__dirname, '.env') });

console.log('Database Configuration connection.js:', {
  database: process.env.DB_DATABASE,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
});

const sequelize = new Sequelize(
  process.env.DB_DATABASE, 
  process.env.DB_USERNAME, 
  process.env.DB_PASSWORD, 
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
  }
);

export default sequelize;