import * as amazon from "amazon-product-api";
import config from "./config";
const amazonClient = amazon.createClient(config.amazon);
import { AmazonProduct } from "./types";

export const getProduct = async (id: string): Promise<AmazonProduct> => {
  const results = await amazonClient.itemLookup({
    idType: "ASIN",
    itemId: id,
    responseGroup: "Offers"
  });
  //return results;

  const productPath = results[0]["Offers"][0]["Offer"][0]["OfferListing"][0];
  const price = results[0]["OfferSummary"][0]["LowestNewPrice"][0]["Amount"][0];
  const currency =
    results[0]["OfferSummary"][0]["LowestNewPrice"][0]["CurrencyCode"][0];
  const isPrime = results[0]["Offers"][0]["Offer"][0]["OfferListing"][0][
    "IsEligibleForPrime"
  ].includes("1");
  return { price: price / 100, currency, isPrime };
};
