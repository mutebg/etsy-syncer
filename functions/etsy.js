const admin = require("firebase-admin");

const url = require("url");
const etsyjs = require("etsyjs2");
const config = require("./config.json");

const etsyClient = etsyjs.client(
  Object.assign(config.etsy, {
    callbackURL:
      "http://localhost:5000/etsy-syncer/us-central1/api/etsy/authorise",
    scope: "email_r%20profile_r%20profile_w%20address_r%20listings_w"
  })
);

exports.getProducts = shop => {
  return getSession().then(({ token, secret }) => {
    return new Promise((resolve, reject) => {
      etsyClient
        .auth(token, secret)
        .get(
          `/shops/${shop}/listings/active`,
          { limit: 1000, include_private: true },
          (err, body, headers) => {
            if (err) return reject(err);
            resolve(headers);
          }
        );
    });
  });
};

exports.updateProduct = (id, data) => {
  return getSession().then(({ token, secret }) => {
    return new Promise((resolve, reject) => {
      etsyClient
        .auth(token, secret)
        .put(`/listings/${id}`, data, (err, body, headers) => {
          if (err) return reject(err);
          resolve({ headers, body });
        });
    });
  });
};

exports.loginUrl = () => {
  return new Promise((resolve, reject) => {
    etsyClient.requestToken((err, response) => {
      if (err) return reject(err);

      setSession(response.token, response.tokenSecret);
      return resolve(response.loginUrl);
    });
  });
};

exports.handleCallbackURL = reqUrl => {
  const query = url.parse(reqUrl, true).query;
  const verifier = query.oauth_verifier;

  return getSession().then(({ token, secret }) => {
    return new Promise((resolve, reject) => {
      // final part of OAuth dance, request access token and secret with given verifier
      etsyClient.accessToken(token, secret, verifier, (err, response) => {
        if (err) return reject(err);
        setSession(response.token, response.tokenSecret);
        resolve(response);
      });
    });
  });
};

const getSession = () =>
  admin
    .firestore()
    .collection("settings")
    .doc("session")
    .get()
    .then(doc => doc.data());

const setSession = (token, secret) =>
  admin
    .firestore()
    .collection("settings")
    .doc("session")
    .set({ token, secret });
