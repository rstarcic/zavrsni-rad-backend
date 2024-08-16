import Stripe from "stripe";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
import iso from "iso-3166-1-alpha-2";
import ServiceProvider from "../models/ServiceProvider.js";
import Client from "../models/Client.js";
import JobContract from "../models/JobContract.js";
import ContractPayment from "../models/ContractPayment.js";
import JobAd from "../models/JobAd.js";
import JobVacancy from "../models/JobVacancy.js";
import PDFDocument from "pdfkit";
import { Buffer } from "buffer";
import { Op } from "sequelize";
import { format } from "date-fns";

async function createServiceProviderStripeAccount(serviceProviderId, email, country) {
  try {
    let twoLetterCountry = iso.getCode(country);
    console.log(twoLetterCountry);
    const account = await stripe.accounts.create({
      type: "custom",
      country: twoLetterCountry,
      email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `http://localhost:8080/service-provider/${serviceProviderId}/stripe-onboarding?mode=refresh&account_id=${account.id}`,
      return_url: `http://localhost:8080/service-provider/${serviceProviderId}/stripe-onboarding?mode=return&account_id=${account.id}`,
      type: "account_onboarding",
    });

    return { url: accountLink.url, accountId: account.id };
  } catch (error) {
    console.error("There was an error with creating connected account for service provider");
    return;
  }
}

async function getStripeAccountStatus(serviceProviderId, serviceProviderStripeAccountId) {
  try {
    const serviceProviderAccount = await JobVacancy.findOne({
      where: { serviceProviderId, serviceProviderStripeAccountId },
      attributes: ["serviceProviderStripeAccountId"],
    });

    if (serviceProviderAccount) {
      return { onboardingComplete: true };
    } else {
      return { onboardingComplete: false };
    }
  } catch (error) {
    console.error("Error in getStripeAccountStatus:", error.message);
    throw new Error("Error fetching service provider status");
  }
}

async function createProductPriceAndCustomer(
  serviceProviderStripeAccountId,
  { title, description, hourlyRate, duration, workingHours, paymentCurrency, email, firstName, lastName, companyName, type }
) {
  let amount = (await _calculateTotalPay(duration, hourlyRate, workingHours)) * 100;
  let name = type === "individual" ? `${firstName} ${lastName}` : companyName;
  try {
    const product = await stripe.products.create(
      {
        name: title,
        description,
      },
      {
        stripeAccount: serviceProviderStripeAccountId,
      }
    );

    const price = await stripe.prices.create(
      {
        product: product.id,
        unit_amount: amount,
        currency: paymentCurrency.toLowerCase(),
      },
      {
        stripeAccount: serviceProviderStripeAccountId,
      }
    );
    const customer = await stripe.customers.create(
      {
        email,
        name,
        description: `Customer for service provider ${name}`,
      },
      {
        stripeAccount: serviceProviderStripeAccountId,
      }
    );
    return { product, price, customer };
  } catch (error) {
    console.error("Error creating Stripe product, price, or customer:", error.message);
    throw new Error("Failed to create product, price, or customer in Stripe");
  }
}

async function saveProductAndPriceByJobAdId(jobAdId, priceId, productId) {
  const [numberOfAffectedRows] = await JobContract.update(
    { priceId, productId },
    {
      where: {
        jobAdId,
      },
    }
  );

  if (numberOfAffectedRows === 0) {
    console.warn(`No JobContract found with JobAdId: ${jobAdId} to update.`);
    return false;
  }

  console.log(`JobContract updated with priceId and productId for JobAdId: ${jobAdId}`);
  return true;
}

async function saveCustomerByClientAndJobId(clientId, jobAdId, customerId) {
  const [numberOfAffectedRows] = await JobAd.update(
    { customerId },
    {
      where: {
        id: jobAdId,
        clientId,
      },
    }
  );

  if (numberOfAffectedRows === 0) {
    console.warn(`No Job ad found with clientId ${clientId} and jobAdId ${jobAdId} to update.`);
    return false;
  }

  console.log(`Client updated with customerId for clientId ${clientId} in job ads`);
  return true;
}

async function createOrUpdateContractPayment(jobContractId, invoiceId, amount) {
  try {
    const [contractPayment, created] = await ContractPayment.findOrCreate({
      where: { jobContractId },
      defaults: {
        invoiceId,
        amount,
        status: "pending",
      },
    });

    if (!created) {
      contractPayment.invoiceId = invoiceId;
      contractPayment.amount = amount;
      contractPayment.status = "completed";
      await contractPayment.save();
    }

    return true;
  } catch (error) {
    console.error("Error creating or updating ContractPayment:", error.message);
    return false;
  }
}

async function fetchDataForCreatingProductAndPrice(jobAdId) {
  try {
    const job = await JobAd.findByPk(jobAdId, {
      attributes: ["id", "title", "description", "hourlyRate", "duration", "workingHours", "paymentCurrency", "customerId"],
      include: {
        model: Client,
        attributes: ["id", "email", "firstName", "lastName", "companyName", "type"],
      },
    });

    if (!job) {
      throw new Error("Job not found");
    }

    const clientDetails = {
      clientId: job.Client.id,
      email: job.Client.email,
      firstName: job.Client.firstName,
      lastName: job.Client.lastName,
      companyName: job.Client.companyName,
      type: job.Client.type,
    };

    const jobDetails = {
      jobAdId: job.id,
      title: job.title,
      description: job.description,
      hourlyRate: job.hourlyRate,
      duration: job.duration,
      workingHours: job.workingHours,
      paymentCurrency: job.paymentCurrency,
      customerId: job.customerId,
    };

    return {
      job: jobDetails,
      client: clientDetails,
    };
  } catch (error) {
    throw new Error(error.message);
  }
}

async function fetchServiceProviderStripeAccount(serviceProviderId, jobAdId) {
  try {
    const serviceProvider = await JobVacancy.findOne({ where: { serviceProviderId, jobAdId }, attributes: ["serviceProviderStripeAccountId"] });
    if (serviceProvider) {
      return serviceProvider.serviceProviderStripeAccountId;
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error fetching service provider Stripe account:", error.message);
    throw new Error("Failed to fetch service provider Stripe account.");
  }
}

async function fetchDataForPayment(jobAdId, clientId) {
  try {
    const client = await Client.findOne({
      where: { id: clientId },
      attributes: ["type"],
    });

    const jobAd = await JobAd.findOne({ where: { id: jobAdId }, attributes: ["title", "customerId"] });

    const jobVacancy = await JobVacancy.findOne({
      where: { jobAdId, jobStatus: "completed" },
      attributes: ["serviceProviderStripeAccountId"],
    });

    if (!jobVacancy) {
      throw new Error("Job vacancy not found");
    }

    const jobContract = await JobContract.findOne({
      where: { jobAdId: jobAdId },
      attributes: ["id", "priceId"],
    });

    if (!jobContract) {
      throw new Error("Job contract not found for the specified job advertisement");
    }

    return {
      type: client.type,
      customerId: jobAd.customerId,
      priceId: jobContract.priceId,
      title: jobAd.title,
      serviceProviderAccountId: jobVacancy.serviceProviderStripeAccountId,
    };
  } catch (error) {
    console.error("Error fetching data for payment:", error.message);
    throw new Error("Error fetching data for payment");
  }
}

async function createCheckoutSession(jobAdId, type, serviceProviderAccountId, customerId, priceId, title) {
  try {
    const session = await stripe.checkout.sessions.create(
      {
        payment_method_types: ["card"],
        mode: "payment",
        payment_intent_data: {
          application_fee_amount: 123,
          setup_future_usage: "off_session",
        },
        invoice_creation: {
          enabled: true,
          invoice_data: {
            description: `Invoice for completed job - ${title}, job ID: ${jobAdId}`,
            rendering_options: {
              amount_tax_display: "include_inclusive_tax",
            },
          },
        },
        customer: customerId,
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        metadata: {
          price_id: priceId,
          customer_id: customerId,
          jobAdId: jobAdId,
        },
        success_url: `http://localhost:8080/client/${type}/payment-status?session_id={CHECKOUT_SESSION_ID}&jobId=${jobAdId}`,
        cancel_url: `http://localhost:8080/client/${type}/payment-status?jobId=${jobAdId}`,
      },
      {
        stripeAccount: serviceProviderAccountId,
      }
    );
    return { session_id: session.id, url: session.url };
  } catch (error) {
    console.error("Error creating Stripe session:", error.message);
    throw new Error("Failed to create Stripe payment session.");
  }
}

async function retrieveCheckoutSession(sessionId, serviceProviderStripeAccountId) {
  return await stripe.checkout.sessions.retrieve(sessionId, {
    stripeAccount: serviceProviderStripeAccountId,
  });
}

async function retrieveInvoice(invoiceId, serviceProviderStripeAccountId) {
  return await stripe.invoices.retrieve(invoiceId, {
    stripeAccount: serviceProviderStripeAccountId,
  });
}

async function generateClientInvoice(invoiceData) {
  const { number, created, due_date, account_name, customer_email, customer_name, subtotal, total, amount_due, description, currency, lines } = invoiceData;
  const createdDate = format(new Date(created * 1000), "MMMM dd, yyyy");
  const dueDate = format(new Date(due_date * 1000), "MMMM dd, yyyy");
  const formattedTotal = new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
  }).format(total / 100);
  const formattedSubtotal = new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
  }).format(subtotal / 100);
  const formattedAmount = new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
  }).format(amount_due / 100);

  const doc = new PDFDocument();
  let buffers = [];

  doc.on("data", buffers.push.bind(buffers));

  const finishPDF = new Promise((resolve, reject) => {
    doc.on("end", () => {
      console.log("PDF generation finished, resolving promise.");
      resolve(Buffer.concat(buffers));
    });
    doc.on("error", reject);
  });

  doc.font("Helvetica-Bold").fontSize(18).text("Invoice", { align: "left" });

  doc
    .moveDown()
    .fontSize(10)
    .font("Helvetica-Bold")
    .text(`Invoice number: ${number}`, { align: "left" })
    .moveDown(0.5)
    .text(`Date of issue: ${createdDate}`, { align: "left" })
    .moveDown(0.5)
    .text(`Date due: ${dueDate}`, { align: "left" })
    .moveDown(2);

  doc.moveDown(1).fontSize(10).font("Helvetica-Bold").text(account_name, { align: "left" }).moveDown(1.5);

  doc.font("Helvetica-Bold").fontSize(10).text("Bill to", 300, doc.y);
  doc.font("Helvetica").fontSize(10).text(`${customer_name}`, 300, doc.y).text(`${customer_email}`, 300, doc.y).moveDown(2);

  doc.font("Helvetica-Bold").fontSize(12).text(`${formattedTotal} due ${dueDate}`, 50, doc.y, { align: "left" }).moveDown(0.5);

  doc.font("Helvetica").fontSize(10).text(`${description}`, { align: "left" }).moveDown(2);

  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .text("Description", 60, doc.y, { continued: true })
    .text("Qty", 250, doc.y, { continued: true })
    .text("Unit price", 310, doc.y, { continued: true })
    .text("Amount", 370, doc.y, { continued: true })
    .moveDown(1);

  doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke().moveDown(1);

  lines.data.forEach((lineItem) => {
    const unitAmount = parseFloat(lineItem.price.unit_amount_decimal) / 100;
    const quantity = lineItem.quantity;
    const itemDescription = lineItem.description;
    const totalAmount = unitAmount * quantity;

    const formattedUnitAmount = new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
    }).format(unitAmount);

    const formattedTotalAmount = new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
    }).format(totalAmount);
    doc
      .font("Helvetica")
      .fontSize(10)
      .text(itemDescription, -95, doc.y, { align: "left", continued: true }) // Align with 'Description'
      .text(quantity.toString(), 125, doc.y, { align: "left", continued: true }) // Align 'Qty' right
      .text(formattedUnitAmount, 190, doc.y, { align: "left", continued: true }) // Align 'Unit price' right
      .text(formattedTotalAmount, 240, doc.y, { align: "left", continued: true }) // Align 'Amount' right
      .moveDown(3);
  });

  doc.strokeColor("lightgrey").moveTo(300, doc.y).lineTo(550, doc.y).stroke().moveDown(0.6);

  doc.font("Helvetica").fontSize(10).text("Subtotal", 0, doc.y, { continued: true }).text(formattedSubtotal, 150, doc.y, { align: "left" }).moveDown(0.5);

  doc.strokeColor("lightgrey").moveTo(300, doc.y).lineTo(550, doc.y).stroke().moveDown(0.6);

  doc.font("Helvetica").fontSize(10).text("Total", 300, doc.y, { continued: true }).text(formattedTotal, 470, doc.y, { align: "left" }).moveDown(0.5);

  doc.strokeColor("lightgrey").moveTo(300, doc.y).lineTo(550, doc.y).stroke().moveDown(0.6);

  doc.font("Helvetica-Bold").fontSize(10).text("Amount due", 300, doc.y, { continued: true }).text(formattedAmount, 435, doc.y, { align: "left" });
  console.log("Calling doc.end()...");
  doc.end();

  try {
    console.log("Waiting for finishPDF promise to resolve...");
    const pdfData = await finishPDF;
    console.log("PDF Buffer Size:", pdfData.length);
    await _saveInvoiceToDatabase(pdfData, invoiceData.id);
    return { success: true, pdfData };
  } catch (error) {
    console.error("Error processing contract:", error);
    return { success: false, error };
  }
}

async function fetchInvoicePDFByJobId(jobAdId) {
  const jobContract = await JobContract.findOne({
    where: { jobAdId: jobAdId },
  });
  console.log("JobContract:", jobContract);

  const contractPayment = await ContractPayment.findOne({
    where: { jobContractId: jobContract.id },
  });
  console.log("ContractPayment:", contractPayment);
  return contractPayment.invoicePdf;
}

async function _saveInvoiceToDatabase(pdfData, invoiceId) {
  try {
    const [updatedRowCount] = await ContractPayment.update(
      {
        invoicePdf: pdfData,
      },
      {
        where: { invoiceId },
      }
    );

    if (updatedRowCount === 0) {
      console.error(`No contract payment found with invoiceId: ${invoiceId}. Invoice not saved.`);
      return null;
    }

    console.log(`Invoice PDF saved successfully for invoiceId: ${invoiceId}`);
    return updatedRowCount;
  } catch (error) {
    console.error(`Error saving invoice PDF to database for invoiceId: ${invoiceId}:`, error);
    throw error;
  }
}

async function updateJobVacancyApplicationStatus(jobAdId, serviceProviderStripeAccountId) {
  try {
    const updateStatus = await JobVacancy.update(
      {
        applicationStatus: "completed",
      },
      {
        where: {
          jobAdId,
          serviceProviderStripeAccountId: {
            [Op.eq]: serviceProviderStripeAccountId,
          },
        },
      }
    );
    console.log(`Job Vacancy status updated for jobAdId ${jobAdId}: completed for ID ${serviceProviderStripeAccountId}.`);
    return updateStatus;
  } catch (error) {
    console.error("Error updating job vacancy status:", error);
    throw error;
  }
}

async function _calculateTotalPay(duration, hourlyRate, workingHours) {
  return duration * hourlyRate * workingHours;
}

export {
  createServiceProviderStripeAccount,
  getStripeAccountStatus,
  createProductPriceAndCustomer,
  fetchServiceProviderStripeAccount,
  saveProductAndPriceByJobAdId,
  saveCustomerByClientAndJobId,
  fetchDataForCreatingProductAndPrice,
  fetchDataForPayment,
  createCheckoutSession,
  retrieveCheckoutSession,
  retrieveInvoice,
  generateClientInvoice,
  fetchInvoicePDFByJobId,
  updateJobVacancyApplicationStatus,
  createOrUpdateContractPayment,
};
