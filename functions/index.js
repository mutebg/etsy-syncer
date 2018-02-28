const express = require("express");
const admin = require("firebase-admin");
const cors = require("cors");
const functions = require("firebase-functions");

const local = require("./local");
const amazon = require("./amazon");
const etsy = require("./etsy");

const app = express();
admin.initializeApp(functions.config().firebase);

app.use(cors());
app.enable("trust proxy");

app.get("/", (req, res) => {
  return res.json({ test: 1 });
});

// refresh all
app.get("/refresh", (req, res) => {
  local.getProducts().then(products => {
    products.map(({ id, amazonId, etsyId, etsyPrice, profit }) => {
      return amazon.getProduct(amazonId).then(amazonProduct => {
        if (shallUpdate(etsyPrice, profit, amazonProduct.price)) {
          return local.updateProduct({
            id,
            etsyPrice: amazonProduct.price + profit
          });
        } else {
          return Promise.resolve();
        }
      });
    });
  });
});

// list of all products
app.get("/products", (req, res) => {
  local
    .getProducts()
    .then(products => {
      res.json({ products });
    })
    .catch(err => {
      res.status(500).send(err);
    });
});

app.get("/etsy", (req, res) => {
  etsy.getProducts("BrooklynStoreOnline").then(data => {
    res.json(data);
  });
});

// add new product
app.post("/products", (req, res) => {
  const data = {};
  return local
    .addProduct(data)
    .then(() => {
      res.json({ status: "ok" });
    })
    .catch(err => {
      res.status(500).send(err);
    });
});

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
  const data = {};
  return local
    .updateProduct(req.param.id, data)
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
    .deleteProduct(req.param.id)
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

exports.api = functions.https.onRequest(app);

exports.syncWithEtsyOnProductChange = functions.firestore
  .document("products/{id}")
  .onCreate(event => {
    const id = event.params.id;
    const data = event.data.exists ? event.data.data() : null;
    if (data.isActive) {
      etsy.updateProduct(data);
    }
  });

const shallUpdate = (etsyPrice, amazonPrice, profit) =>
  etsyPrice !== amazonPrice + profit;
