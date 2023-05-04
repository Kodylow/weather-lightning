const express = require('express');
const ViteExpress = require("vite-express");
require('websocket-polyfill');
globalThis.crypto = require('crypto');
const alby = require('alby-js-sdk');
const AlbyTools = require('alby-tools');

const funding = require('./getFundingDetails');

const utils = require('./utils');
const app = express();

const PORT = process.env.PORT || 3000;
const SECRET = Buffer.from(process.env.JWT_SECRET);
const RECIPIENT = "albydev@getalby.com";
const PRICE_IN_SATS = 100;
const SPLIT_AMOUNT = 20;
const nostrWalletConnectUrl = process.env.NWC_URL;
const NWC = new alby.webln.NostrWebLNProvider({ nostrWalletConnectUrl });
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
      console.info(`Paying ${amount} to ${details.name}`);
      const ln = new AlbyTools.LightningAddress(details.lnAddress);
      await ln.fetch();
      const invoice = await ln.requestInvoice({satoshi: amount, comment: "Split payment from replit app"});
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
  const authHeader = req.get('Authorization');
  if (authHeader) {
    console.info(`Auth header present`);
    const [token, preimage] = authHeader.replace('LSAT ', '').split(":");
    const isValid = await utils.isValidPreimage(token, preimage);
    if(isValid) {
      console.info(`Payment valid.`);
      console.info(`Paying API and requesting data`);

      const url = `https://lsat-weather-api.getalby.repl.co/${city}`;
      const response = await AlbyTools.lsat.fetchWithLsat(url, {}, { webln: NWC });
      const data = await response.json();

      console.log(`Sending split payments to dependencies`);
      payLibraries(SPLIT_AMOUNT);
      
      return res.json(data);
    }
  }

  console.info("Requesting LSAT payment");
  const ln = new AlbyTools.LightningAddress(RECIPIENT);
  await ln.fetch();
  const invoice = await ln.requestInvoice({satoshi: PRICE_IN_SATS}); 
  const jwt = await utils.generateToken(invoice);
  res.set({'www-authenticate': `LSAT macaroon=${jwt},invoice=${invoice.paymentRequest}`});
  res.status(402).json({invoice: invoice.paymentRequest, macaroon: invoice.paymentHash});
});


ViteExpress.listen(app, PORT, () => {
  console.log(`Server is listening on port ${PORT}...`);
});
