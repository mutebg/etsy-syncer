import * as admin from "firebase-admin";
import * as url from "url";
import { client } from "./oauth";
import config from "./config";
import { EtsyProductResponse, Session, EtsyProduct } from "./types";

const etsyClient = client(
  Object.assign(config.etsy, {
    callbackURL:
      //"http://localhost:5000/etsy-syncer/us-central1/api/etsy/authorise",
      "https://us-central1-etsy-syncer.cloudfunctions.net/api/etsy/authorise",
    scope:
      "email_r%20profile_r%20profile_w%20address_r%20listings_w%20listings_r"
  })
);

export async function getProducts(shop: string): Promise<any> {
  const { token, secret } = await getSession();
  return new Promise((resolve, reject) => {
    etsyClient
      .auth(token, secret)
      .get(
        `/shops/${shop}/listings/active`,
        { limit: 1000, include_private: true },
        (err: Error, headers: any, body: EtsyProductResponse): void => {
          if (err) {
            reject(err);
          } else {
            resolve(body);
          }
        }
      );
  });
}

// export const getProducts = async (
//   shop: string
// ): Promise<EtsyProductResponse> => {
//   const { token, secret } = await getSession();
//   return new Promise((resolve, reject) => {
//
//   });
// };

export const updateProduct = (id, data) => {
  return getSession().then(({ token, secret }) => {
    return new Promise((resolve, reject) => {
      etsyClient
        .auth(token, secret)
        .put(`/listings/${id}`, data, (err, body, headers): void => {
          if (err) return reject(err);
          resolve(headers);
        });
    });
  });
};

export const updatePrice = async (id, product_id, offering_id, price) => {
  const data = {
    product_id: product_id,
    property_values: [],
    offerings: [
      {
        offering_id,
        price,
        quantity: 10
      }
    ]
  };

  const { token, secret } = await getSession();
  return new Promise((resolve, reject) => {
    etsyClient
      .auth(token, secret)
      .put(
        `/listings/${id}/inventory`,
        { products: JSON.stringify([data]), price_on_property: [] },
        (err, headers, body) => {
          if (err) return reject(err);
          resolve(body);
        }
      );
  });
};

export const getPrice = async (id: number): Promise<any> => {
  const { token, secret } = await getSession();
  return new Promise((resolve, reject) => {
    etsyClient
      .auth(token, secret)
      .get(`/listings/${id}/inventory`, (err, body, headers) => {
        if (err) return reject(err);
        resolve(headers);
      });
  });
};

export const loginUrl = () => {
  return new Promise((resolve, reject) => {
    etsyClient.requestToken((err, response) => {
      if (err) return reject(err);

      setSession(response.token, response.tokenSecret);
      return resolve(response.loginUrl);
    });
  });
};

export const handleCallbackURL = reqUrl => {
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

const getSession = (): Promise<Session> =>
  admin
    .firestore()
    .collection("settings")
    .doc("session")
    .get()
    .then(doc => doc.data() as Session);

const setSession = (token, secret): Promise<any> =>
  admin
    .firestore()
    .collection("settings")
    .doc("session")
    .set({ token, secret });
