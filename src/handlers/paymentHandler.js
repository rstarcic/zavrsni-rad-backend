import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
import iso from 'iso-3166-1-alpha-2';
import ServiceProvider from '../models/ServiceProvider.js';
import Client from '../models/Client.js';
import JobContract from '../models/JobContract.js';

async function createServiceProviderStripeAccount(serviceProviderId, email, country) {
    try {
        let twoLetterCountry = iso.getCode(country);
        console.log(twoLetterCountry);
          const account = await stripe.accounts.create({
            type: 'custom',
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
      
          return { url: accountLink.url, accountId: account.id  };
    } catch (error) {
        console.error("There was an error with creating connected account for service provider")
        return;
    }
}

async function getStripeAccountStatus(serviceProviderId, serviceProviderStripeAccountId) {
    try {
        const serviceProviderAccount = await ServiceProvider.findByPk(serviceProviderId, {
            attributes: ['serviceProviderStripeAccountId']
        });
  
        const accountId = serviceProviderAccount.serviceProviderStripeAccountId;
        if (accountId) {
            if (accountId === serviceProviderStripeAccountId) {
                return { onboardingComplete: true };
            } else {
                return { onboardingComplete: false };
            }
        } else {
            return null;
        }
    } catch (error) {
        console.error('Error in getStripeAccountStatus:', error.message);
        throw new Error('Error fetching service provider status');
    }
}

async function createProductPriceAndCustomer(serviceProviderStripeAccountId, {
    title,
    description,
    hourlyRate, duration, workingHours, paymentCurrency, email, firstName, lastName, companyName, type
})
{
    let amount = await _calculateTotalPay(duration, hourlyRate, workingHours) * 100;
    let name = type === 'individual' ? `${firstName} ${lastName}` : companyName;
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
        console.error('Error creating Stripe product, price, or customer:', error.message);
        throw new Error('Failed to create product, price, or customer in Stripe');
    }
}

async function saveProductAndPriceByJobAdId(jobAdId, priceId, productId) {
    const [numberOfAffectedRows] = await JobContract.update(
        { priceId, productId }, 
        {
            where: {
                jobAdId
            }
        }
    );

    if (numberOfAffectedRows === 0) {
        console.warn(`No JobContract found with JobAdId: ${jobAdId} to update.`);
        return false;
    }

    console.log(`JobContract updated with priceId and productId for JobAdId: ${jobAdId}`);
    return true;
}

async function saveCustomerByClientId(clientId, customerId) {
    const [numberOfAffectedRows] = await Client.update(
        { customerId }, 
        {
            where: {
                id: clientId
            }
        }
    );

    if (numberOfAffectedRows === 0) {
        console.warn(`No Client found with ClientId: ${clientId} to update.`);
        return false;
    }

    console.log(`Client updated with customerId for ClientId: ${clientId}`);
    return true;
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
export { createServiceProviderStripeAccount, getStripeAccountStatus, createProductPriceAndCustomer, saveProductAndPriceByJobAdId, saveCustomerByClientId }