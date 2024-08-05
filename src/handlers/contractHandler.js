import JobAd from '../models/JobAd.js';
import ServiceProvider from '../models/ServiceProvider.js';
import Client from '../models/Client.js';
import JobContract from '../models/JobContract.js';
import PDFDocument from 'pdfkit';
import { Buffer } from 'buffer';
import JobVacancy from '../models/JobVacancy.js';
import { Op } from 'sequelize';

async function fetchClientDataForContract(jobId, serviceProviderId, clientId) {
    try {
        const serviceProviderData = await ServiceProvider.findByPk(serviceProviderId, { attributes: ['id'] });
        const clientData = await Client.findByPk(clientId, { attributes: ['firstName', 'lastName', 'companyName', 'address', 'city'] });
        const jobData = await JobAd.findByPk(jobId, { attributes: ['id', 'workDeadline', 'hourlyRate', 'paymentCurrency', 'workingHours', 'duration', 'description'] });
        
        if (!serviceProviderData && !clientData && !jobData) {
            throw new Error('Data not found');
        }

        let amount = null;
        if (jobData.duration && jobData.hourlyRate && jobData.workingHours) {
            amount = _calculateTotalPay(jobData.duration, jobData.hourlyRate, jobData.workingHours)
        }

        return { serviceProviderData, clientData, jobData, amount };
    } catch (error) {
        console.error('Error fetching data for contract:', error);
        throw error;
    }
}

async function fetchAllDataForContract(jobId, serviceProviderId, clientId) {
    try {
        console.log("jobId", jobId);
        console.log("serviceProviderId", serviceProviderId);
        console.log("clientId", clientId);
    const serviceProviderData = await ServiceProvider.findByPk(serviceProviderId, { attributes: ['id', 'firstName', 'lastName', 'city', 'address', 'iban', 'bankName'] });
    const clientData = await Client.findByPk(clientId, { attributes: ['firstName', 'lastName', 'companyName', 'address', 'city'] });
    const jobData = await JobAd.findByPk(jobId, { attributes: ['id', 'workDeadline', 'hourlyRate', 'paymentCurrency', 'workingHours', 'duration', 'description'] });

    if (!serviceProviderData && !clientData && !jobData) {
        throw new Error('Data not found');
    }
    let amount = null;
    if (jobData.duration && jobData.hourlyRate && jobData.workingHours) {
        amount = _calculateTotalPay(jobData.duration, jobData.hourlyRate, jobData.workingHours)
    }
    return { serviceProviderData, clientData, jobData, amount };
}
 catch (error) {
    console.error('Error fetching data for contract:', error);
    throw error;
}
}

async function fetchContractByJobAdId(jobAdId) {
    try {
        const jobContract = await JobContract.findOne({ where: { jobAdId } })
        if (!jobContract) {
            throw new Error("No job contract");
        }
        return jobContract.contract;
    } catch (error) {
        console.error('Error fetching job contract:', error);
        throw error;
    }
}

async function fetchContractByContractId(id) {
    try {
        const jobContract = await JobContract.findByPk(id);
        if (!jobContract) {
            throw new Error("No job contract");
        }
        return jobContract.contract;
    } catch (error) {
        console.error('Error fetching job contract:', error);
        throw error;
    }
}

async function fetchClientContracts(clientId) {
    try {
        const clientContracts = await Client.findByPk(clientId, {
            include: [{
                model: JobAd, attributes: ["id", "title"],
                required: true,
                include: [
                    {
                    model: JobContract,
                        attributes: ["id", "updatedAt", "status", "contract"],
                        required: true,
                    }
                ]
            }
            ]
        });
        if (!clientContracts) {
            throw new Error("No client contracts");
        }
        clientContracts.JobAds.forEach(jobAd => {
            jobAd.JobContracts.forEach(jobContract => {
                jobContract.setDataValue('updatedAt', formatDateToMMDDYYYYHHMM(jobContract.updatedAt));
            });
        });
        return clientContracts;
    } catch (error) {
        console.error('Error fetching client contracts:', error);
        throw error;
    }
}

async function isContractSigned(jobAdId, signatureField) {
    try {
        const jobContract = await JobContract.findOne({ where: { jobAdId } })
        if (!jobContract) {
            return;
        }
        return !!jobContract[signatureField];
    } catch (error) {
        console.error('Error fetching job contract:', error);
        throw error;
    }
}

async function generateClientContract(res, clientSignature, contractData) {
    const { clientData, serviceProviderData, jobData, amount } = contractData;
    const doc = new PDFDocument({ size: 'A4' });
    
    let buffers = [];
    doc.on('data', buffers.push.bind(buffers));

    const finishPDF = new Promise((resolve, reject) => {
        doc.on('end', () => {
            resolve(Buffer.concat(buffers));
        });
        doc.on('error', reject);
    });
  
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="output.pdf"');
    
    doc.pipe(res);

    const clientName = clientData.companyName ? clientData.companyName : `${clientData.firstName} ${clientData.lastName}`;
    const totalAmount = `${amount} ${jobData.paymentCurrency}`;
    const currentDate = _formatDate( new Date());
    const dateAndPlace = `${currentDate} , ${clientData.city}`;
    const deadline = _formatDate( jobData.workDeadline);

    doc.text(clientName + ', ' + clientData.address, { align: 'left' }).moveUp();
    doc.moveDown(0.1);
    doc.font('Helvetica').text('_____________________________ (hereinafter referred to as the client) and');
    doc.fontSize(12).text('(name, surname, address)', { align: 'left' });
    doc.moveDown(1);

    doc.moveDown(0.1);
    doc.font('Helvetica').text('____________________________ (hereinafter referred to as the service provider)');
    doc.fontSize(12).text('(name, surname, address)', { align: 'left' });
    doc.moveDown();

    doc.font('Helvetica').text('Enter into this');
    doc.moveDown();
    doc.font('Helvetica-BoldOblique').text('CONTRACT FOR SERVICES', { align: 'center' });
    doc.moveDown(0.5);
    doc.font('Helvetica').text('Defining the rights and obligations of the client and the service provider.');
    doc.moveDown();
    doc.font('Helvetica-BoldOblique').fontSize(12).text('SUBJECT OF THE CONTRACT', { align: 'left' });
    doc.font('Helvetica-BoldOblique').fontSize(12).text('Article 1.', { align: 'center' });
    doc.font('Helvetica').text('By this Contract, the client, and the service provider agree to perform the following tasks: ', { align: 'center' });
    doc.moveDown();

    doc.text(jobData.description, { align: 'left' }).moveUp();
    doc.text('___________________________________________________________________');
    doc.moveDown();
    doc.text('___________________________________________________________________');
    doc.moveDown();
    doc.text('___________________________________________________________________');
    doc.moveDown();

    doc.font('Helvetica-BoldOblique').fontSize(12).text('PERFORMANCE OF OBLIGATIONS', { align: 'left' });
    doc.moveDown();
    doc.font('Helvetica-BoldOblique').fontSize(12).text('Article 2.', { align: 'center' });
    doc.moveDown();

    doc.text(deadline, { align: 'left' }).moveUp(2);
    doc.font('Helvetica').text('The deadline for the performance of the obligations from Article 1 is no later than: _______________________.');
    doc.moveDown(2);

    doc.font('Helvetica-BoldOblique').fontSize(12).text('Article 3.', { align: 'center' });
    doc.moveDown();
    doc.text(totalAmount, { align: 'left' }).moveUp(2);
    doc.font('Helvetica').text('The client shall pay the service provider for the tasks from Article 1 in the amount of _______________.', { align: 'left' });
    doc.moveDown(2);

    doc.moveDown();
    doc.font('Helvetica').text('The payment shall be made to the service provider\'s account number __________________________:');
    doc.moveDown();

    doc.font('Helvetica').text('opened with the bank ____________________________.', { align: 'left' });
    doc.moveDown();

    doc.font('Helvetica-BoldOblique').fontSize(12).text('Article 4.', { align: 'center' });
    doc.moveDown(1);
    doc.text(clientName, { align: 'left' }).moveUp(2);
    doc.font('Helvetica').text('The tax on the agreed amount from Article 3 shall be paid by _______________________________.', { align: 'left' });
    doc.moveDown();
    doc.font('Helvetica-BoldOblique').fontSize(12).text('Article 5.', { align: 'center' });
    doc.font('Helvetica').text('The service provider is obliged to allow the client to inspect the status of the completed work when requested by the client. If it is found that the work, which is the subject of this Contract, contains defects, the client may set a deadline for the service provider to remove the defects, and if the service provider does not remove them within the set deadline, the client may terminate this Contract and demand compensation for damages.', { align: 'left' });
    doc.moveDown();

    doc.font('Helvetica-BoldOblique').fontSize(12).text('JURISDICTION OF THE COURT', { align: 'left' });
    doc.moveDown();
    doc.font('Helvetica-BoldOblique').fontSize(12).text('Article 6.', { align: 'center' });
    doc.moveDown(0.5);

    doc.font('Helvetica').text('In case of a dispute, the court in __________________ shall have jurisdiction.', { align: 'left' });
    doc.moveDown();
    doc.font('Helvetica').text('This Contract is made in 2 copies, with each party retaining one copy.', { align: 'left' });
    doc.moveDown(3);

    doc.text(dateAndPlace, { align: 'left' }).moveUp(3);
    doc.font('Helvetica').text('Date and place:', { align: 'left' });
    doc.moveDown();
    doc.font('Helvetica').text('_______________________________.', { align: 'left' });
    doc.moveDown(3);
    if (clientSignature) {
        doc.image(clientSignature, { fit: [420, 60], align: 'right' });
      }
    doc.font('Helvetica').text('Service provider:                                                       Client: ', { align: 'left' });
    doc.moveDown(2);
    doc.font('Helvetica').text('_______________________                                     _______________________.', { align: 'left' });
    doc.end();

    try {
        const pdfData = await finishPDF;
        await _saveInitialContractToDatabase(pdfData, jobData.id);
        console.log('Contract saved successfully');
        await _updateJobVacancyApplicationStatus(jobData.id, serviceProviderData.id);
        return { success: true, pdfData };
    } catch (error) {
        console.error('Error processing contract:', error);
        return { success: false, error };
    }
}

async function generateServiceProviderContract(res, serviceProviderSignature, contractData) {
    const { clientData, serviceProviderData, jobData, amount } = contractData;
    const clientSignature = await _fetchClientSignatureIfContractExists(jobData.id);
    console.log(clientSignature)
    let clientSignatureBuffer = Buffer.from(clientSignature);
    const signature = `${clientSignatureBuffer}`;
    console.log(serviceProviderSignature)
    const doc = new PDFDocument({ size: 'A4' });
    
    let buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', async () => {
        let pdfData = Buffer.concat(buffers);
        const jobContract = await _updatePDFContract(pdfData, serviceProviderSignature, jobData.id);
        console.log('Contract saved successfully', jobContract);
        await _updateJobVacancyJobStatus(jobData.id, serviceProviderData.id);
    });
  
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="output.pdf"');
    
    doc.pipe(res);

    const clientName = clientData.companyName ? clientData.companyName : `${clientData.firstName} ${clientData.lastName}`;
    const totalAmount = `${amount} ${jobData.paymentCurrency}`;
    const currentDate = _formatDate( new Date());
    const dateAndPlace = `${currentDate} , ${clientData.city}`;
    const deadline = _formatDate( jobData.workDeadline);

    doc.text(clientName + ', ' + clientData.address, { align: 'left' }).moveUp();
    doc.moveDown(0.1);
    doc.font('Helvetica').text('_____________________________ (hereinafter referred to as the client) and');
    doc.fontSize(12).text('(name, surname, address)', { align: 'left' });
    doc.moveDown(1);

    doc.text(serviceProviderData.firstName + ' ' + serviceProviderData.lastName + ', ' + serviceProviderData.address, { align: 'left' }).moveUp();
    doc.moveDown(0.1);
    doc.font('Helvetica').text('____________________________ (hereinafter referred to as the service provider)');
    doc.fontSize(12).text('(name, surname, address)', { align: 'left' });
    doc.moveDown();

    doc.font('Helvetica').text('Enter into this');
    doc.moveDown();
    doc.font('Helvetica-BoldOblique').text('CONTRACT FOR SERVICES', { align: 'center' });
    doc.moveDown(0.5);
    doc.font('Helvetica').text('Defining the rights and obligations of the client and the service provider.');
    doc.moveDown();
    doc.font('Helvetica-BoldOblique').fontSize(12).text('SUBJECT OF THE CONTRACT', { align: 'left' });
    doc.font('Helvetica-BoldOblique').fontSize(12).text('Article 1.', { align: 'center' });
    doc.font('Helvetica').text('By this Contract, the client, and the service provider agree to perform the following tasks: ', { align: 'center' });
    doc.moveDown();

    doc.text(jobData.description, { align: 'left' }).moveUp();
    doc.text('___________________________________________________________________');
    doc.moveDown();
    doc.text('___________________________________________________________________');
    doc.moveDown();
    doc.text('___________________________________________________________________');
    doc.moveDown();

    doc.font('Helvetica-BoldOblique').fontSize(12).text('PERFORMANCE OF OBLIGATIONS', { align: 'left' });
    doc.moveDown();
    doc.font('Helvetica-BoldOblique').fontSize(12).text('Article 2.', { align: 'center' });
    doc.moveDown();

    doc.text(deadline, { align: 'left' }).moveUp(2);
    doc.font('Helvetica').text('The deadline for the performance of the obligations from Article 1 is no later than: _______________________.');
    doc.moveDown(2);

    doc.font('Helvetica-BoldOblique').fontSize(12).text('Article 3.', { align: 'center' });
    doc.moveDown();
    doc.text(totalAmount, { align: 'left' }).moveUp(2);
    doc.font('Helvetica').text('The client shall pay the service provider for the tasks from Article 1 in the amount of _______________.', { align: 'left' });
    doc.moveDown(2);

    doc.text(serviceProviderData.iban, { align: 'left' }).moveUp(3);
    doc.moveDown();
    doc.font('Helvetica').text('The payment shall be made to the service provider\'s account number __________________________:');
    doc.moveDown();

    doc.text(serviceProviderData.bankName, { align: 'center' }).moveUp();
    doc.font('Helvetica').text('opened with the bank ____________________________.', { align: 'left' });
    doc.moveDown();

    doc.font('Helvetica-BoldOblique').fontSize(12).text('Article 4.', { align: 'center' });
    doc.moveDown(1);
    doc.text(clientName, { align: 'left' }).moveUp(2);
    doc.font('Helvetica').text('The tax on the agreed amount from Article 3 shall be paid by _______________________________.', { align: 'left' });
    doc.moveDown();
    doc.font('Helvetica-BoldOblique').fontSize(12).text('Article 5.', { align: 'center' });
    doc.font('Helvetica').text('The service provider is obliged to allow the client to inspect the status of the completed work when requested by the client. If it is found that the work, which is the subject of this Contract, contains defects, the client may set a deadline for the service provider to remove the defects, and if the service provider does not remove them within the set deadline, the client may terminate this Contract and demand compensation for damages.', { align: 'left' });
    doc.moveDown();

    doc.font('Helvetica-BoldOblique').fontSize(12).text('JURISDICTION OF THE COURT', { align: 'left' });
    doc.moveDown();
    doc.font('Helvetica-BoldOblique').fontSize(12).text('Article 6.', { align: 'center' });
    doc.moveDown(0.5);

    doc.text(serviceProviderData.city, { align: 'center' }).moveUp();
    doc.font('Helvetica').text('In case of a dispute, the court in __________________ shall have jurisdiction.', { align: 'left' });
    doc.moveDown();
    doc.font('Helvetica').text('This Contract is made in 2 copies, with each party retaining one copy.', { align: 'left' });
    doc.moveDown(3);

    doc.text(dateAndPlace, { align: 'left' }).moveUp(3);
    doc.font('Helvetica').text('Date and place:', { align: 'left' });
    doc.moveDown();
    doc.font('Helvetica').text('_______________________________.', { align: 'left' });
    doc.moveDown(3);
    if (serviceProviderSignature) {
        doc.image(serviceProviderSignature, { fit: [200, 60], align: 'left' });
    }
    if (signature) {
        doc.image(signature , { fit: [420, 60], align: 'right' });
      }
    doc.font('Helvetica').text('Service provider:                                                       Client: ', { align: 'left' });
    doc.moveDown(2);
    doc.font('Helvetica').text('_______________________                                     _______________________.', { align: 'left' });
    doc.end();
}

async function saveClientSignatureToDatabase(clientSignature, jobAdId) {
    const jobContract = await JobContract.create({
        clientSignature,
        jobAdId
    });
    return jobContract;
}

async function _fetchClientSignatureIfContractExists(jobId) {
    const contract = await JobContract.findOne({ where: { jobAdId: jobId }, attributes: ['clientSignature'] });
    if (!contract) {
        throw new Error('Contract not found');
    }
    return contract.clientSignature;
}

function _formatDate(date) {
    return new Date(date).toLocaleDateString('en-GB');
}

function formatDateToMMDDYYYYHHMM(dateString) {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); 
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${month}/${day}/${year} ${hours}:${minutes}`;
}

async function _saveInitialContractToDatabase(pdfData, jobAdId) {
    const jobContract = await JobContract.update({
        contract: pdfData
    }, {
        where: { jobAdId }  
    });
    return jobContract;
}

async function _updatePDFContract(contractData, serviceProviderSignature, jobAdId) {
    try {
        const contract = await JobContract.findOne({ where: { jobAdId } });
        if (!contract) {
            throw new Error('Contract not found');
        }
        await contract.update({
            contract: contractData,
            serviceProviderSignature,
            status: 'completed'
        });
        console.log('Contract updated successfully');
    } catch (error) {
        console.error('Error updating the contract:', error);
        throw error; 
    }
}

async function _updateJobVacancyApplicationStatus(jobAdId, serviceProviderId ) {
    try {
        await JobVacancy.update({
            applicationStatus: 'rejected'
        }, {
            where: {
                jobAdId,
                serviceProviderId: {
                    [Op.ne]: serviceProviderId  
                }
            }
        });
        await JobVacancy.update({
            applicationStatus: 'selected'
        }, {
            where: {
                jobAdId,
                serviceProviderId: serviceProviderId  
            }
        });
        console.log(`Job Vacancy statuses updated for jobAdId ${jobAdId}: selected for ID ${serviceProviderId} and rejected for others.`);
    } catch (error) {
        console.error('Error updating job vacancy status:', error);
        throw error;
    }
}

async function _updateJobVacancyJobStatus(jobAdId, serviceProviderId ) {
    try {
        await JobVacancy.update({
            jobStatus: 'ongoing'
        }, {
            where: {
                jobAdId,
                serviceProviderId 
            }
        });
        console.log(`Job Vacancy job status updated for jobAdId ${jobAdId}: ongoing for ID ${serviceProviderId}`);
    } catch (error) {
        console.error('Error updating job vacancy job status:', error);
        throw error;
    }
}

function _calculateTotalPay(duration, hourlyRate, workingHours) {
    const durationRegex = /^(\d+)\s*(day|week|month)s?$/;
    const match = duration.match(durationRegex);

    if (!match) {
        throw new Error("Invalid duration format. Please use 'number day/week/month'.");
    }

    const quantity = parseInt(match[1]);
    const unit = match[2];

    let totalHours = 0;
    switch (unit) {
        case 'day':
            totalHours = quantity * workingHours;
            break;
        case 'week':
            totalHours = quantity * workingHours * 7; 
            break;
        case 'month':
            totalHours = quantity * workingHours * 7 * 4.33;
            break;
        default:
            throw new Error("Invalid duration unit. Please use 'day', 'week', or 'month'.");
    }

    return totalHours * hourlyRate;
}

export {
    fetchClientDataForContract, generateClientContract, fetchContractByJobAdId, fetchContractByContractId, fetchAllDataForContract, generateServiceProviderContract, saveClientSignatureToDatabase, isContractSigned, fetchClientContracts
}
