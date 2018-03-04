"use strict";

import * as express from "express";
import * as admin from "firebase-admin";
import * as cors from "cors";
import * as functions from "firebase-functions";

import * as local from "./local";
import * as amazon from "./amazon";
import * as etsy from "./etsy";
import { LocalProduct } from "./types";

const app = express();
admin.initializeApp(functions.config().firebase);

app.use(cors());
app.enable("trust proxy");

app.get("/", (req, res) => {
  return res.json({ test: 10 });
});

// refresh all
app.get("/refresh", async (req, res) => {
  const localProducts = await local.getProducts();
  const productsProm = localProducts
    // filter only active products and those which have amazon id & profit
    .filter(p => p.isActive && p.amazonId && p.profit)
    .map(async ({ id, amazonId, etsyPrice, profit, minPrice }) => {
      // get amazon price
      const amazonProduct = await amazon.getProduct(amazonId);
      // check if last price at etsy is different from amazon + profit
      if (shallUpdate(etsyPrice, profit, amazonProduct.price)) {
        console.log("UPDATE");
        // update local price and don't allow to be under min price
        const newPrice = amazonProduct.price + profit;
        return local.updateProduct(id, {
          etsyPrice: newPrice > minPrice ? newPrice : minPrice
        });
      } else {
        console.log("NO --- UPDATE");
        return Promise.resolve(null);
      }
    });
  return Promise.all(productsProm).then(() => {
    res.json({
      ok: 1
    });
  });
});

// list of all products
app.get("/products", async (req, res) => {
  const localProductsProm = local.getProducts();
  const etsyProductsProm = etsy.getProducts("BrooklynStoreOnline");
  const [localProducts, etsyProductsResult] = await Promise.all([
    localProductsProm,
    etsyProductsProm
  ]);
  const etsyProducts = etsyProductsResult.results;
  const localProductsMap = localProducts.reduce((prev, current) => {
    prev[current.id] = current;
    return prev;
  }, {});

  const productsProm: LocalProduct[] = etsyProducts.map(async p => {
    if (!localProductsMap[p.listing_id]) {
      try {
        const data = await etsy.getPrice(p.listing_id);
        const productId = data.results.products[0].product_id;
        const offeringId = data.results.products[0].offerings[0].offering_id;

        // add product
        const newProduct: LocalProduct = {
          id: p.listing_id,
          isActive: false,
          title: p.title,
          etsyPrice: 0,
          amazonId: "",
          profit: 0,
          minPrice: 0,
          productId,
          offeringId
        };

        //add new product
        local.addProduct(newProduct);
        return Promise.resolve(newProduct);
      } catch (e) {
        console.log("cant add product", e);
      }
    }
    return Promise.resolve(localProductsMap[p.listing_id]);
  });

  const products = await Promise.all(productsProm);

  return res.json({
    products
  });
});

// edit product
app.post("/products/:id", async (req, res) => {
  const data: {
    isActive: boolean;
    profit: number;
    amazonId: string;
    minPrice: number;
    etsyPrice?: number;
  } = {
    isActive: req.body.isActive,
    profit: req.body.profit,
    amazonId: req.body.amazonId,
    minPrice: req.body.minPrice
  };

  if (data.isActive) {
    const amazonProduct = await amazon.getProduct(data.amazonId);
    const etsyPrice = amazonProduct.price + data.profit;
    data.etsyPrice = etsyPrice >= data.minPrice ? etsyPrice : data.minPrice;
  }
  return local
    .updateProduct(req.params.id, data)
    .then(() => {
      res.json({
        status: "ok"
      });
    })
    .catch(err => {
      res.status(500).send(err);
    });
});

app.get("/test", (req, res) => {
  etsy
    //.updatePrice(583365760, 2105848909, 2323039318, 40)
    .getPrice(583365760)
    .then(data => {
      const product_id = data.results.products[0].product_id;
      const offering_id = data.results.products[0].offerings[0].offering_id;
      res.json({
        data,
        status: "ok"
      });
    })
    .catch(err => {
      res.status(500).send(err);
    });
});

app.get("/test/amazon/:id", (req, res) => {
  amazon.getProduct(req.params.id).then(data => {
    res.json(data);
  });
});

app.get("/etsy/login", (req, res) => {
  etsy.loginUrl().then(url => {
    res.send(`<a href="${url}">LOGIN</a>`);
  });
});

app.get("/etsy/authorise", (req, res) => {
  etsy.handleCallbackURL(req.url).then(resp => {
    res.send(`YOU HAVE BEEN LOGGED`);
  });
});

export const api = functions.https.onRequest(app);

export const syncWithEtsyOnProductChange = functions.firestore
  .document("products/{id}")
  .onUpdate(event => {
    const id = event.params.id;
    const data = event.data.exists ? event.data.data() : null;
    if (data.isActive) {
      return etsy.updatePrice(
        id,
        data.productId,
        data.offeringId,
        data.etsyPrice
      );
    }
    return false;
  });

const shallUpdate = (etsyPrice, amazonPrice, profit) =>
  etsyPrice !== amazonPrice + profit;
