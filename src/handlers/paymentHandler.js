import Stripe from "stripe";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
import iso from "iso-3166-1-alpha-2";
import ServiceProvider from "../models/ServiceProvider.js";
import Client from "../models/Client.js";
import JobContract from "../models/JobContract.js";
import ContractPayment from "../models/ContractPayment.js";
import JobAd from "../models/JobAd.js";
import JobVacancy from "../models/JobVacancy.js";

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
        clientId
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

async function ensureCustomerEmail(customerId, customerEmail, serviceProviderAccountId) {
  try {
    console.log("Fetching customer with ID:", customerId);
    let customer = await stripe.customers.retrieve(customerId, {
      stripeAccount: serviceProviderAccountId,
    });
    if (customer.email !== customerEmail) {
      customer = await stripe.customers.update(
        customerId,
        {
          email: customerEmail,
        },
        {
          stripeAccount: serviceProviderAccountId,
        }
      );
    }
    return customer;
  } catch (error) {
    throw new Error("Error retrieving or updating customer: " + error.message);
  }
}

async function createInvoice(customerId, jobTitle, jobAdId, serviceProviderAccountId) {
  try {
    const invoiceDescription = `Invoice for Job Service - ${jobTitle} with job ID: ${jobAdId}`;
    return await stripe.invoices.create(
      {
        customer: customerId,
        collection_method: "send_invoice",
        days_until_due: 30,
        description: invoiceDescription,
        auto_advance: false,
      },
      {
        stripeAccount: serviceProviderAccountId,
      }
    );
  } catch (error) {
    throw new Error("Error creating invoice: " + error.message);
  }
}

async function createInvoiceItem(customerId, priceId, jobDescription, invoiceId, serviceProviderAccountId) {
  try {
    return await stripe.invoiceItems.create(
      {
        customer: customerId,
        price: priceId,
        invoice: invoiceId,
        description: jobDescription,
      },
      {
        stripeAccount: serviceProviderAccountId,
      }
    );
  } catch (error) {
    throw new Error("Error creating invoice item: " + error.message);
  }
}

async function finalizeInvoice(invoiceId, serviceProviderAccountId) {
  try {
    return await stripe.invoices.finalizeInvoice(invoiceId, {
      stripeAccount: serviceProviderAccountId,
    });
  } catch (error) {
    throw new Error("Error finalizing invoice: " + error.message);
  }
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
      contractPayment.status = "pending";
      await contractPayment.save();
    }

    return true;
  } catch (error) {
    console.error("Error creating or updating ContractPayment:", error.message);
    return false;
  }
}

async function fetchDataForCreatingProductAndInvoice(jobAdId) {
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
    const serviceProvider = await JobVacancy.findOne({ where: { serviceProviderId, jobAdId }, attributes: ["serviceProviderStripeAccountId"] })
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

    const jobAd = await JobAd.findOne({ where: { id: jobAdId }, attributes: ["customerId"] });

    const jobVacancy = await JobVacancy.findOne({
      where: { jobAdId, jobStatus: 'completed' },
      attributes: ["serviceProviderStripeAccountId"],
    });

    if (!jobVacancy) {
      throw new Error("Job vacancy not found");
    }

    const jobContract = await JobContract.findOne({
      where: { jobAdId: jobAdId },
      attributes: ["id", "priceId"],
    });

    const contractPayment = await ContractPayment.findOne({
      where: { jobContractId: jobContract.id },
      attributes: ["invoiceId"],
    });
    if (!jobContract) {
      throw new Error("Job contract not found for the specified job advertisement");
    }

    return {
      type: client.type,
      customerId: jobAd.customerId,
      priceId: jobContract.priceId,
      invoiceId: contractPayment?.invoiceId || null,
      serviceProviderAccountId: jobVacancy.serviceProviderStripeAccountId,
    };
  } catch (error) {
    console.error("Error fetching data for payment:", error.message);
    throw new Error("Error fetching data for payment");
  }
}

async function payInvoice(jobAdId, type, serviceProviderAccountId, customerId, priceId, invoiceId) {
  try {
    const session = await stripe.checkout.sessions.create(
      {
        payment_method_types: ['card'],
        mode: "payment",
        invoice_creation: {
          enabled: true,
        },
        customer: customerId,
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        payment_intent_data: {
          application_fee_amount: 123,
          description: `Payment for invoice ${invoiceId}`,
        },
        metadata: {
          invoice_id: invoiceId,
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

async function checkIfInvoicePaid(serviceProviderStripeAccountId, sessionId) {
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      stripeAccount: serviceProviderStripeAccountId,
    });

    const invoiceId = session.metadata.invoice_id;

    if (!invoiceId) {
      throw new Error('No invoice ID found in session metadata.');
    }

    const invoice = await stripe.invoices.retrieve(invoiceId, {
      stripeAccount: serviceProviderStripeAccountId,
    });

    if (invoice.status === 'open') {
      const paidInvoice = await stripe.invoices.pay(invoiceId, {
        stripeAccount: serviceProviderStripeAccountId,
      });

      if (paidInvoice.status === 'paid') {
        console.log(`Invoice ${invoiceId} successfully marked as paid.`);
        return { status: 'paid', invoiceId };
      } else {
        console.log(`Failed to mark invoice ${invoiceId} as paid.`);
        return { status: 'open', invoiceId };
      }
    } else {
      console.log(`Invoice ${invoiceId} is already marked as ${invoice.status}.`);
      return { status: invoice.status, invoiceId };  
    }
  } catch (error) {
    console.error('Error verifying or paying invoice:', error.message);
    return { status: 'error', message: error.message };
  }
}

async function _calculateTotalPay(duration, hourlyRate, workingHours) {
  const durationRegex = /^(\d+)\s*(day|week|month)s?$/;
  const match = duration.match(durationRegex);

  if (!match) {
    throw new Error("Invalid duration format. Please use 'number day/week/month'.");
  }

  const quantity = parseInt(match[1]);
  const unit = match[2];

  let totalHours = 0;
  switch (unit) {
    case "day":
      totalHours = quantity * workingHours;
      break;
    case "week":
      totalHours = quantity * workingHours * 7;
      break;
    case "month":
      totalHours = quantity * workingHours * 7 * 4.33;
      break;
    default:
      throw new Error("Invalid duration unit. Please use 'day', 'week', or 'month'.");
  }

  return totalHours * hourlyRate;
}

export {
  createServiceProviderStripeAccount,
  getStripeAccountStatus,
  createProductPriceAndCustomer,
  fetchServiceProviderStripeAccount,
  saveProductAndPriceByJobAdId,
  saveCustomerByClientAndJobId,
  ensureCustomerEmail,
  createInvoice,
  createInvoiceItem,
  finalizeInvoice,
  createOrUpdateContractPayment,
  fetchDataForCreatingProductAndInvoice,
  fetchDataForPayment,
  payInvoice,
  checkIfInvoicePaid,
};
