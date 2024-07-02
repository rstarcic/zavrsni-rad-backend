import sequelize from '../db/connection.js';
import Client from './Client.js';
import ServiceProvider from './ServiceProvider.js';
import Education from './Education.js';
import WorkExperience from './WorkExperience.js';
import Language from './Language.js';
import JobAd from './JobAd.js';
import JobVacancy from './JobVacancy.js';
import JobContract from './JobContract.js';
import ContractPayment from './ContractPayment.js';


Client.hasMany(JobAd, { foreignKey: 'clientId' });
JobAd.belongsTo(Client, { foreignKey: 'clientId' });

ServiceProvider.hasMany(Education, { foreignKey: 'serviceProviderId' });
Education.belongsTo(ServiceProvider, { foreignKey: 'serviceProviderId' });

ServiceProvider.hasMany(WorkExperience, { foreignKey: 'serviceProviderId' });
WorkExperience.belongsTo(ServiceProvider, { foreignKey: 'serviceProviderId' });

ServiceProvider.hasMany(Language, { foreignKey: 'serviceProviderId' });
Language.belongsTo(ServiceProvider, { foreignKey: 'serviceProviderId' });

JobAd.hasMany(JobVacancy, { foreignKey: 'jobAdId' });
ServiceProvider.hasMany(JobVacancy, { foreignKey: 'serviceProviderId' });

JobVacancy.belongsTo(JobAd, { foreignKey: 'jobAdId' });
JobVacancy.belongsTo(ServiceProvider, { foreignKey: 'serviceProviderId' });

JobAd.belongsToMany(ServiceProvider, { through: JobVacancy, foreignKey: 'jobAdId' });
ServiceProvider.belongsToMany(JobAd, { through: JobVacancy, foreignKey: 'serviceProviderId' });

JobAd.hasMany(JobContract, { foreignKey: 'jobAdId' })
JobContract.belongsTo(JobAd, { foreignKey: 'jobAdId' })

JobContract.hasOne(ContractPayment, { foreignKey: 'jobContractId' })
ContractPayment.belongsTo(JobContract)

const syncModels = async () => {
    try {
      await sequelize.authenticate();
      console.log('Connection has been established successfully.');
      await sequelize.sync({ force: true });
      console.log('All models were synchronized successfully.');
    } catch (error) {
      console.error('Unable to synchronize models:', error);
    }
  };
  
export { syncModels };