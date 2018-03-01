'use strict';

import * as express from "express";
import * as admin from 'firebase-admin';
import * as cors from "cors";
import * as functions from "firebase-functions";

import * as local from "./local";
import * as amazon from "./amazon";
import * as etsy from "./etsy";
import { LocalProduct } from './types';

const app = express();
admin.initializeApp(functions.config().firebase);

app.use(cors());
app.enable("trust proxy");

app.get("/", (req, res) => {
  return res.json({ test: 10 });
});

// refresh all
app.get("/refresh", async (req, res) => {
  const products = await local.getProducts();
  return products.map( async ({ id, amazonId, etsyPrice, profit }) => {
    const amazonProduct = await amazon.getProduct(amazonId);
    if ( shallUpdate(etsyPrice, profit, amazonProduct.price) ) {
      return local.updateProduct(id, {
        id,
        etsyPrice: amazonProduct.price + profit
      });
    } else {
      return null;
    }
  });
});

// list of all products
app.get("/products",  async (req, res) => {
  const localProductsProm = local.getProducts()
  const etsyProductsProm = etsy.getProducts("BrooklynStoreOnline");
  const [localProducts, etsyProductsResult] = await Promise.all([localProductsProm, etsyProductsProm]);
  const etsyProducts = etsyProductsResult.results;
  const localProductsMap = localProducts.reduce( (prev, current) => {
    prev[ current.id ] = current;
    return prev;
  }, {});

  const products:LocalProduct[] = etsyProducts.map( (p) => {
    if( ! localProductsMap[p.listing_id]) {
      // add product
      const newProduct:LocalProduct = {
        id: p.listing_id,
        isActive: false,
        title: p.title,
        etsyPrice: 0,
        amazonId: "",
        profit: 0
      }

      //add new product
      local.addProduct(newProduct);
      return newProduct;
    }
    return localProductsMap[p.listing_id];
  });

  return res.json({
    products,
  });

  // local
  //   .getProducts()
  //   .then(products => {
  //     res.json({ products });
  //   })
  //   .catch(err => {
  //     res.status(500).send(err);
  //   });
});

// app.get("/etsy", async (req, res) => {
//   const etsyProducts = await etsy.getProducts("BrooklynStoreOnline");
//   res.json(etsyProducts)
// });


app.get("/etsyupdate", (req, res) => {
  etsy
    .updateProduct(583365760, {
      price: 23.0
    })
    .then(s => console.log({ s }))
    .catch(e => console.log({ e }));
});

// edit product
app.put("/products/:id", (req, res) => {
  const data = {
    isActive: req.body.isActive,
    profit: req.body.profit,
    amazonId: req.body.amazonId,
    etsyPrice: req.body.etsyPrice,
  };
  return local
    .updateProduct(req.params.id, data)
    .then(() => {
      res.json({ status: "ok" });
    })
    .catch(err => {
      res.status(500).send(err);
    });
});

// delete product
app.delete("/products/:id", (req, res) => {
  return local
    .deleteProduct(req.params.id)
    .then(() => {
      res.json({ status: "ok" });
    })
    .catch(err => {
      res.status(500).send(err);
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
  .onCreate(event => {
    const id = event.params.id;
    const data = event.data.exists ? event.data.data() : null;
    if (data.isActive) {
      etsy.updateProduct(id, data);
    }
  });

const shallUpdate = (etsyPrice, amazonPrice, profit) =>
  etsyPrice !== amazonPrice + profit;
