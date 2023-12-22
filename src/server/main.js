const express = require('express');
const morgan = require('morgan');
const ViteExpress = require("vite-express");
require('websocket-polyfill');
globalThis.crypto = require('crypto');
const alby = require('alby-js-sdk');
const AlbyTools = require('alby-tools');

const funding = require('./getFundingDetails');
const utils = require('./utils');

const app = express();
app.use(morgan('combined'));

const PORT = process.env.PORT || 3000;
const SECRET = Buffer.from(process.env.JWT_SECRET);


const PRICE_IN_SATS = 100;
const SPLIT_AMOUNT = 20;
const RECIPIENT = "albydev@getalby.com";
// the app's wallet connection
const NWC = new alby.webln.NostrWebLNProvider({ nostrWalletConnectUrl: process.env.NWC_URL });
NWC.enable();


let splitRecipients = [];
funding.getLightningFundingDetails().then(details => {
  splitRecipients = details;
})

async function payLibraries(totalAmount) {
  const recipientsCount = splitRecipients.length;
  const amount = Math.floor(totalAmount / recipientsCount);
  splitRecipients.forEach(async (details) => {
    try {
      console.info(`Paying ${amount} to npm package: ${details.name}`);
      const ln = new AlbyTools.LightningAddress(details.lnAddress);
      await ln.fetch();
      const invoice = await ln.requestInvoice({satoshi: amount  , comment: "Split payment from replit app"});
      const response = await NWC.sendPayment(invoice.paymentRequest);
      console.log(response);
    } catch(e) {
      console.error(e);
    }
  })
}

app.get('/lookup', async function(req, res) {
  const city = req.query['city'];
  console.info(`Request: ${city}`);

  // first check the user's payment and request the payment
  const authHeader = req.get('Authorization');
  // user has sent a payment
  if (authHeader) {
    const [token, preimage] = authHeader.replace('L402 ', '').split(":");
    const isValid = await utils.isValidPreimage(token, preimage, req.originalUrl);
    // validate that the payment details a re correct
    if(isValid) {
      console.info(`User payment valid.`);
      console.info(`Paying API and requesting data`);

      const url = `https://lsat-weather-api.getalby.repl.co/${city}`;
      const response = await AlbyTools.l402.fetchWithL402(url, {}, { webln: NWC });
      const data = await response.json();

      console.log(`Sending split payments to npm dependencies`);
      payLibraries(SPLIT_AMOUNT);
      
      return res.json(data);
    }
  }

  // request the payment from the user using the LSAT header
  
  console.info("Requesting payment from user");
  const ln = new AlbyTools.LightningAddress(RECIPIENT, { proxy: null });
  await ln.fetch();
  console.info(`Getting lightning invoice for the user`);
  const invoice = await ln.requestInvoice({satoshi: PRICE_IN_SATS}); 
  const jwt = await utils.generateToken(invoice, req.originalUrl);
  res.set({'www-authenticate': `L402 token=${jwt},invoice=${invoice.paymentRequest}`});
  res.status(402).json({invoice: invoice.paymentRequest, macaroon: invoice.paymentHash});
});


ViteExpress.listen(app, PORT, () => {
  console.log(`Server is listening on port ${PORT}...`);
});
