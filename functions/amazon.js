const amazon = require("amazon-product-api");
const config = require("./config.json");
const amazonClient = amazon.createClient(config.amazon);

exports.getProduct = id =>
  amazonClient
    .itemLookup({
      idType: "ASIN",
      itemId: id,
      responseGroup: "Offers"
    })
    .then(results => {
      const productPath =
        results[0]["Offers"][0]["Offer"][0]["OfferListing"][0];
      const pricePath = productPath["Price"][0];
      const price = pricePath["Amount"][0];
      const currency = pricePath["CurrencyCode"][0];
      const isPrime = productPath["IsEligibleForPrime"].includes("1");
      return { price: price / 100, currency, isPrime };
    });