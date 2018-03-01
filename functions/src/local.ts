import * as admin from 'firebase-admin';
import { LocalProduct } from './types';

export const getProducts = async ():Promise<LocalProduct[]> => {
  const snapshot = await admin
    .firestore()
    .collection("products")
    .get();

  const products = [];
  snapshot.forEach(doc => {
    products.push(doc.data());
  });
  return products;
  // return [
  //   {
  //     id: 583365760,
  //     isActive: true,
  //     title: "Neshto",
  //     etsyPrice: 12.99,
  //     amazonId: "B07175BDZS",
  //     profit: 5
  //   }
  // ];
};

export const updateProduct = (id:number, data:any) => {
  return admin
    .firestore()
    .collection("products")
    .doc(String(id))
    .set(data);
};

export const addProduct = (data:LocalProduct) => {
  return admin
    .firestore()
    .collection("products")
    .doc(String(data.id))
    .set(data);
};

export const deleteProduct = (id:number) => {
  return admin
    .firestore()
    .collection("products")
    .doc(String(id))
    .delete();
};
